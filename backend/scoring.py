import sys
from pathlib import Path

import networkx as nx
import numpy as np
from sentence_transformers import SentenceTransformer

sys.path.insert(0, str(Path(__file__).parent.parent))

# Loaded once at import time — shared across all calls
model = SentenceTransformer("all-MiniLM-L6-v2")


# ── helpers ───────────────────────────────────────────────────────────────────

def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom else 0.0


# ── signal 1 : semantic similarity ───────────────────────────────────────────

def semantic_similarity(resume_skills: list, jd_skills: list) -> float:
    """
    Embed both skill lists as single sentences and return their cosine
    similarity.  Returns 0.0 if either list is empty.
    """
    if not resume_skills or not jd_skills:
        return 0.0
    r_text = " ".join(resume_skills)
    j_text = " ".join(jd_skills)
    r_emb, j_emb = model.encode([r_text, j_text])
    return _cosine(r_emb, j_emb)


# ── signal 2 : graph distance ─────────────────────────────────────────────────

def graph_distance_score(
    G: nx.Graph,
    resume_skills: list,
    jd_skills: list,
) -> float:
    """
    For each JD skill present in G, find the shortest path to the nearest
    resume skill.  Score per JD skill = 1 / distance (1.0 for exact match,
    0.0 for unreachable).  Return the mean, normalised to [0, 1].
    """
    if not jd_skills or not resume_skills:
        return 0.0

    G_nodes = set(G.nodes())
    resume_set = set(resume_skills) & G_nodes
    valid_jd   = [s for s in jd_skills if s in G_nodes]

    if not valid_jd or not resume_set:
        return 0.0

    scores: list[float] = []
    for jd_skill in valid_jd:
        # BFS distances from this jd_skill to all reachable nodes
        try:
            lengths = nx.single_source_shortest_path_length(G, jd_skill)
        except nx.NodeNotFound:
            scores.append(0.0)
            continue

        min_dist = min(
            (lengths[r] for r in resume_set if r in lengths),
            default=None,
        )
        if min_dist is None:
            scores.append(0.0)
        elif min_dist == 0:
            scores.append(1.0)       # exact match
        else:
            scores.append(1.0 / min_dist)

    raw = sum(scores) / len(scores) if scores else 0.0
    return min(raw, 1.0)


# ── signal 3 : propagation score ─────────────────────────────────────────────

def propagation_score(
    G: nx.Graph,
    jd_skills: list,
    resume_skills: list,
    steps: int = 3,
) -> float:
    """
    BFS from each JD skill up to `steps` hops; score resume skills found
    in the expanding neighbourhood with weight = 1 / 2**distance.

    Exact skill matches score 1.0; neighbours score 0.5; two hops 0.25; …
    Exponential decay prevents dense graphs from making everything reachable
    with equal weight — A's direct JD overlaps still dominate B's indirect ones.

    Returns total weighted hits / max possible hits, capped at 1.0.
    """
    if not jd_skills or not resume_skills:
        return 0.0

    G_nodes    = set(G.nodes())
    resume_set = set(resume_skills) & G_nodes
    valid_jd   = [s for s in jd_skills if s in G_nodes]

    if not valid_jd or not resume_set:
        return 0.0

    total: float = 0.0

    for jd in valid_jd:
        # BFS: visited maps node → distance from jd
        visited: dict[str, int] = {jd: 0}
        frontier: list[str]     = [jd]

        for hop in range(steps):
            nxt: list[str] = []
            for node in frontier:
                for nbr in G.neighbors(node):
                    if nbr not in visited:
                        visited[nbr] = hop + 1
                        nxt.append(nbr)
            frontier = nxt

        for rs in resume_set:
            if rs in visited:
                total += 1.0 / (2 ** visited[rs])   # 1.0 at d=0, 0.5 at d=1 …

    # max possible: every resume skill at d=0 from every JD skill
    max_total = float(len(valid_jd) * len(resume_set))
    return min(total / max_total, 1.0) if max_total else 0.0


# ── combiner ──────────────────────────────────────────────────────────────────

def final_score(
    s1: float,
    s2: float,
    s3: float,
    weights: tuple[float, float, float] = (0.4, 0.35, 0.25),
) -> float:
    """Weighted sum of the three signals, rounded to 4 decimal places."""
    return round(weights[0] * s1 + weights[1] * s2 + weights[2] * s3, 4)


# ── smoke test ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import pandas as pd
    from backend.extraction import batch_extract
    from backend.graph import build_resume_graph

    DATA = Path(__file__).parent / "data"

    # Build a real co-occurrence graph from the first 100 resumes
    print("Building co-occurrence graph from 100 resumes…")
    resumes = pd.read_csv(DATA / "training_data.csv")
    candidates = batch_extract(resumes.head(100), "Resume Text")
    G = build_resume_graph(candidates)
    print(f"  {G.number_of_nodes()} nodes, {G.number_of_edges()} edges\n")

    # JD skill set for the test
    jd_skills = [
        "python", "machine learning", "sql", "tensorflow",
        "data analysis", "pandas", "scikit-learn",
    ]

    # Candidate A: heavy overlap with JD
    candidate_A = [
        "python", "machine learning", "sql", "pandas",
        "numpy", "data analysis", "statistics",
    ]

    # Candidate B: barely overlaps — different domain entirely
    candidate_B = [
        "marketing", "sales", "leadership",
        "communication", "financial analysis",
    ]

    print("=" * 58)
    print(f"{'Signal':<28} {'Candidate A':>12} {'Candidate B':>12}")
    print("=" * 58)

    results = {}
    for label, skills in [("A (data-sci)", candidate_A), ("B (business)", candidate_B)]:
        s1 = semantic_similarity(skills, jd_skills)
        s2 = graph_distance_score(G, skills, jd_skills)
        s3 = propagation_score(G, jd_skills, skills)
        fs = final_score(s1, s2, s3)
        results[label] = dict(s1=s1, s2=s2, s3=s3, fs=fs)

    a, b = results["A (data-sci)"], results["B (business)"]

    rows = [
        ("Semantic similarity",    a["s1"], b["s1"]),
        ("Graph distance score",   a["s2"], b["s2"]),
        ("Propagation score",      a["s3"], b["s3"]),
        ("-" * 28,                 None,    None),
        ("Final score",            a["fs"], b["fs"]),
    ]
    for name, av, bv in rows:
        if av is None:
            print(f"  {name}")
        else:
            ok = " [A>B]" if av > bv else " [A<=B]"
            print(f"  {name:<26} {av:>12.4f} {bv:>12.4f}{ok}")

    print()
    all_pass = all(a[k] > b[k] for k in ("s1", "s2", "s3", "fs"))
    print("  A > B on all signals:", "PASS" if all_pass else "FAIL")
