import sys
from pathlib import Path

import networkx as nx

sys.path.insert(0, str(Path(__file__).parent.parent))

_NEXT_GRADE: dict[str, str] = {"D": "C", "C": "B", "B": "A", "A": "already top"}


# ── grade skill profiles ──────────────────────────────────────────────────────

def get_grade_skill_profiles(
    ranked_results: list,
    G: nx.Graph,
) -> dict[str, set]:
    """
    Union all_skills across every candidate in each grade bucket.
    Returns {grade: set_of_skills}.
    """
    profiles: dict[str, set] = {g: set() for g in "ABCD"}
    for r in ranked_results:
        profiles[r["grade"]].update(r["all_skills"])
    return profiles


# ── per-candidate gap ─────────────────────────────────────────────────────────

def compute_gap(
    candidate: dict,
    grade_profiles: dict[str, set],
    G: nx.Graph,
) -> dict:
    """
    Compute the skill gap between this candidate and the next grade up.

    Returns
    -------
    {
      current_grade : str,
      next_grade    : str,
      missing_skills: list,          all skills in next grade not held
      learning_paths: [
        {target_skill, domain, path, hops}
      ]                              one entry per reachable missing skill,
                                     sorted by hops ascending
    }
    """
    current_grade = candidate["grade"]
    next_grade    = _NEXT_GRADE[current_grade]

    if next_grade == "already top":
        return {
            "current_grade":  current_grade,
            "next_grade":     next_grade,
            "missing_skills": [],
            "learning_paths": [],
        }

    candidate_set = set(candidate["all_skills"])
    missing       = sorted(grade_profiles[next_grade] - candidate_set)

    G_nodes        = set(G.nodes())
    sources_in_G   = [s for s in candidate["all_skills"] if s in G_nodes]
    targets_in_G   = [s for s in missing if s in G_nodes]

    learning_paths: list[dict] = []

    for target in targets_in_G:
        best_path: list | None = None
        best_len               = float("inf")

        for src in sources_in_G:
            try:
                path = nx.shortest_path(G, src, target)
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                continue
            if len(path) < best_len:
                best_len  = len(path)
                best_path = path

        if best_path is not None:
            learning_paths.append({
                "target_skill": target,
                "domain":       G.nodes[target].get("domain", "unknown"),
                "path":         best_path,
                "hops":         len(best_path) - 1,
            })

    learning_paths.sort(key=lambda x: x["hops"])

    return {
        "current_grade":  current_grade,
        "next_grade":     next_grade,
        "missing_skills": missing,
        "learning_paths": learning_paths,
    }


# ── batch ─────────────────────────────────────────────────────────────────────

def batch_gap(ranked_results: list, G: nx.Graph) -> list[dict]:
    """Run compute_gap for every candidate; result list mirrors ranked order."""
    grade_profiles = get_grade_skill_profiles(ranked_results, G)
    return [compute_gap(c, grade_profiles, G) for c in ranked_results]


# ── smoke test ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import pandas as pd
    from backend.extraction import batch_extract, extract_from_skill_string
    from backend.graph import build_resume_graph
    from backend.ranking import rank_candidates, _flatten

    DATA = Path(__file__).parent / "data"

    # ── replicate the ranking.py test setup ───────────────────────────────────
    resumes = pd.read_csv(DATA / "training_data.csv")
    target_cats = [
        "Technology", "Data & Analytics",
        "Marketing & Sales", "Healthcare", "Human Resources",
    ]
    sample = (
        pd.concat(
            [resumes[resumes["Category"] == cat].head(4) for cat in target_cats]
        )
        .reset_index(drop=True)
    )
    candidates  = batch_extract(sample, "Resume Text")
    G           = build_resume_graph(candidates)

    jobs    = pd.read_csv(DATA / "all_job_post.csv")
    jd_row  = jobs[
        jobs["job_title"].str.contains("Software Engineer", case=False, na=False)
    ].iloc[0]
    jd_extracted = extract_from_skill_string(jd_row["job_skill_set"])
    jd_skills    = _flatten(jd_extracted)

    ranked = rank_candidates(candidates, jd_skills, G)

    # ── run gap analysis ──────────────────────────────────────────────────────
    gaps = batch_gap(ranked, G)

    grade_dist = {g: sum(1 for r in ranked if r["grade"] == g) for g in "ABCD"}

    # ── rank 1 (grade A) ──────────────────────────────────────────────────────
    r1   = ranked[0]
    gap1 = gaps[0]
    print("=" * 62)
    print(f"RANK 1  |  Candidate {r1['candidate_id']}  |  Grade {r1['grade']}")
    print("=" * 62)
    print(f"  current_grade  : {gap1['current_grade']}")
    print(f"  next_grade     : {gap1['next_grade']}")
    print(f"  missing_skills : {gap1['missing_skills']}")
    print(f"  learning_paths : {gap1['learning_paths']}")

    # ── rank 20 (grade D) ─────────────────────────────────────────────────────
    r20   = ranked[-1]
    gap20 = gaps[-1]
    print()
    print("=" * 62)
    print(f"RANK 20 |  Candidate {r20['candidate_id']}  |  Grade {r20['grade']}")
    print("=" * 62)
    print(f"  current_grade  : {gap20['current_grade']}")
    print(f"  next_grade     : {gap20['next_grade']}")
    print(f"  skills held    : {r20['all_skills']}")
    print(f"  missing_skills : {gap20['missing_skills']}")
    print(f"  learning_paths ({len(gap20['learning_paths'])} found):")
    for lp in gap20["learning_paths"][:8]:   # first 8 for readability
        print(f"    [{lp['hops']} hop(s)] {lp['path']}  domain={lp['domain']}")

    # ── assertions ────────────────────────────────────────────────────────────
    print()
    assert gap1["next_grade"] == "already top", "Rank-1 (A) should be already top"
    assert gap20["current_grade"] == "D",        "Rank-20 should be grade D"
    assert len(gap20["learning_paths"]) > 0,     "Grade D must have learning paths"
    paths_are_lists = all(
        isinstance(lp["path"], list) and len(lp["path"]) >= 2
        for lp in gap20["learning_paths"]
    )
    assert paths_are_lists, "Every learning_path must be a list of >= 2 nodes"
    print("All assertions passed.")
