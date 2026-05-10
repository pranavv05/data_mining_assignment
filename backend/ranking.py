import sys
from pathlib import Path

import networkx as nx
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))
from backend.scoring import (
    semantic_similarity,
    graph_distance_score,
    propagation_score as _propagation_score,
    final_score,
)

# Must mirror the weights inside final_score so breakdown fractions are exact
_WEIGHTS = (0.4, 0.35, 0.25)
_SIGNAL_NAMES = ("semantic", "distance", "propagation")


# ── helpers ───────────────────────────────────────────────────────────────────

def _flatten(skills_by_domain: dict) -> list[str]:
    """Flatten {domain: [skills]} → deduplicated flat list."""
    seen: set[str] = set()
    out: list[str] = []
    for skills in skills_by_domain.values():
        for s in skills:
            if s not in seen:
                seen.add(s)
                out.append(s)
    return out


# ── grading ───────────────────────────────────────────────────────────────────

def assign_grade(score: float, all_scores: list) -> str:
    """
    Grade by percentile within the candidate pool.

    A = top 25%       (score >= 75th-percentile threshold)
    B = 50th - 75th
    C = 25th - 50th
    D = bottom 25%    (score <  25th-percentile threshold)
    """
    arr = np.array(all_scores, dtype=float)
    p75 = float(np.percentile(arr, 75))
    p50 = float(np.percentile(arr, 50))
    p25 = float(np.percentile(arr, 25))

    if score >= p75:
        return "A"
    elif score >= p50:
        return "B"
    elif score >= p25:
        return "C"
    else:
        return "D"


# ── core ranking ──────────────────────────────────────────────────────────────

def rank_candidates(
    candidates: list,
    jd_skills: list,
    G: nx.Graph,
) -> list[dict]:
    """
    Score every candidate against the JD and return a ranked list.

    Parameters
    ----------
    candidates : list of {candidate_id, skills_by_domain}  (batch_extract output)
    jd_skills  : flat taxonomy-normalised skill list from the job description
    G          : co-occurrence graph built from the same candidate pool

    Returns
    -------
    List sorted by final_score descending. Each entry contains rank, scores,
    grade, dominant signal, matched/missing skills, and score breakdown.
    """
    jd_set = set(jd_skills)
    raw: list[dict] = []

    for c in candidates:
        resume_skills = _flatten(c["skills_by_domain"])
        resume_set    = set(resume_skills)

        s1 = semantic_similarity(resume_skills, jd_skills)
        s2 = graph_distance_score(G, resume_skills, jd_skills)
        s3 = _propagation_score(G, jd_skills, resume_skills)
        fs = final_score(s1, s2, s3, weights=_WEIGHTS)

        # weighted contribution of each signal
        w_sem  = _WEIGHTS[0] * s1
        w_dist = _WEIGHTS[1] * s2
        w_prop = _WEIGHTS[2] * s3

        dominant = _SIGNAL_NAMES[
            [w_sem, w_dist, w_prop].index(max(w_sem, w_dist, w_prop))
        ]

        if fs > 0:
            breakdown = {
                "semantic":    round(w_sem  / fs, 4),
                "distance":    round(w_dist / fs, 4),
                "propagation": round(w_prop / fs, 4),
            }
        else:
            breakdown = {"semantic": 0.0, "distance": 0.0, "propagation": 0.0}

        raw.append({
            "candidate_id":      str(c["candidate_id"]),
            "final_score":       fs,
            "semantic_score":    round(s1, 4),
            "distance_score":    round(s2, 4),
            "propagation_score": round(s3, 4),
            "dominant_signal":   dominant,
            "matched_skills":    sorted(jd_set & resume_set),
            "missing_skills":    sorted(jd_set - resume_set),
            "score_breakdown":   breakdown,
            "all_skills":        resume_skills,
        })

    raw.sort(key=lambda x: x["final_score"], reverse=True)

    all_scores = [r["final_score"] for r in raw]

    ranked: list[dict] = []
    for rank, entry in enumerate(raw, start=1):
        ranked.append({
            "rank":              rank,
            "candidate_id":      entry["candidate_id"],
            "final_score":       entry["final_score"],
            "grade":             assign_grade(entry["final_score"], all_scores),
            "semantic_score":    entry["semantic_score"],
            "distance_score":    entry["distance_score"],
            "propagation_score": entry["propagation_score"],
            "dominant_signal":   entry["dominant_signal"],
            "matched_skills":    entry["matched_skills"],
            "missing_skills":    entry["missing_skills"],
            "all_skills":        entry["all_skills"],
            "score_breakdown":   entry["score_breakdown"],
        })

    return ranked


# ── smoke test ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import pandas as pd
    from backend.extraction import batch_extract, extract_from_skill_string
    from backend.graph import build_resume_graph

    DATA = Path(__file__).parent / "data"

    # ── 1. Build a mixed-category candidate pool (20 resumes) ─────────────────
    resumes = pd.read_csv(DATA / "training_data.csv")

    target_cats = [
        "Technology",
        "Data & Analytics",
        "Marketing & Sales",
        "Healthcare",
        "Human Resources",
    ]
    sample = (
        pd.concat(
            [resumes[resumes["Category"] == cat].head(4) for cat in target_cats]
        )
        .reset_index(drop=True)   # gives candidate_id 0-19
    )
    print(f"Candidate pool: {len(sample)} resumes, "
          f"categories = {sample['Category'].unique().tolist()}")

    candidates = batch_extract(sample, "Resume Text")

    # ── 2. Co-occurrence graph from the same pool ─────────────────────────────
    G = build_resume_graph(candidates)
    print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges\n")

    # ── 3. Pick a Software Engineer JD ────────────────────────────────────────
    jobs = pd.read_csv(DATA / "all_job_post.csv")
    jd_row = jobs[
        jobs["job_title"].str.contains("Software Engineer", case=False, na=False)
    ].iloc[0]

    print(f"JD : {jd_row['job_title']}  (id={jd_row['job_id']})")
    jd_extracted = extract_from_skill_string(jd_row["job_skill_set"])
    jd_skills    = _flatten(jd_extracted)
    print(f"JD skills extracted ({len(jd_skills)}): {jd_skills}\n")

    # ── 4. Rank ───────────────────────────────────────────────────────────────
    ranked = rank_candidates(candidates, jd_skills, G)

    # ── 5. Print top 5 ────────────────────────────────────────────────────────
    print("=" * 68)
    print("TOP 5 CANDIDATES")
    print("=" * 68)
    for r in ranked[:5]:
        print(f"\nRank {r['rank']}  |  Candidate {r['candidate_id']}"
              f"  |  Grade {r['grade']}  |  Score {r['final_score']:.4f}")
        print(f"  Scores   : semantic={r['semantic_score']}  "
              f"distance={r['distance_score']}  "
              f"propagation={r['propagation_score']}")
        print(f"  Dominant : {r['dominant_signal']}")
        print(f"  Breakdown: {r['score_breakdown']}")
        print(f"  Matched  : {r['matched_skills']}")
        print(f"  Missing  : {r['missing_skills']}")

    # ── 6. Grade distribution check ───────────────────────────────────────────
    from collections import Counter
    grade_dist = Counter(r["grade"] for r in ranked)
    print("\n" + "=" * 68)
    print("GRADE DISTRIBUTION")
    print("=" * 68)
    for g in ("A", "B", "C", "D"):
        bar = "#" * grade_dist.get(g, 0)
        print(f"  {g}: {bar} ({grade_dist.get(g, 0)})")

    all_grades = set(grade_dist)
    assert all_grades == {"A", "B", "C", "D"}, (
        f"Expected all four grades, got: {sorted(all_grades)}"
    )
    print("\n  All four grades present: PASS")
