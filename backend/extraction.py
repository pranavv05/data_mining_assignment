import ast
import re
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from backend.taxonomy import load_taxonomy, get_all_skills

# ── module-level cache ────────────────────────────────────────────────────────

_all_skills: list[str] = []
_skill_to_domain: dict[str, str] = {}
_skill_patterns: dict[str, re.Pattern] = {}   # pre-compiled word-boundary patterns


def _init() -> None:
    """Populate the skill list, reverse lookup map, and regex cache once."""
    global _all_skills, _skill_to_domain, _skill_patterns
    if _skill_to_domain:
        return
    taxonomy = load_taxonomy()
    _all_skills = get_all_skills(taxonomy)
    _skill_to_domain = {
        skill: domain
        for domain, skills in taxonomy.items()
        for skill in skills
    }
    _skill_patterns = {
        skill: re.compile(r'\b' + re.escape(skill) + r'\b')
        for skill in _all_skills
    }


# ── public API ────────────────────────────────────────────────────────────────

def extract_from_text(text: str) -> dict[str, list[str]]:
    """
    Word-boundary match every taxonomy skill against lowercased free text.
    Returns {domain: [matched_skills]}, domains with 0 matches omitted.
    """
    _init()
    text_lower = text.lower().replace('-', ' ')
    matched: dict[str, list[str]] = {}
    for skill in _all_skills:
        if _skill_patterns[skill].search(text_lower):
            domain = _skill_to_domain.get(skill, "unknown")
            matched.setdefault(domain, []).append(skill)
    return matched


def extract_from_skill_string(skill_str: str) -> dict[str, list[str]]:
    """
    Parse a job_skill_set string (Python list literal) and match each item
    against the taxonomy via bidirectional substring comparison.
    Returns {domain: [matched_skills]}, domains with 0 matches omitted.
    """
    _init()

    # Parse the list literal; fall back to comma-split if malformed
    try:
        items: list[str] = ast.literal_eval(skill_str)
    except (ValueError, SyntaxError):
        items = [s.strip().strip("'\"[] ") for s in skill_str.split(",")]

    items_lower = [str(item).lower().strip() for item in items]

    matched: dict[str, list[str]] = {}
    seen: set[str] = set()
    for item in items_lower:
        for skill in _all_skills:
            if skill in seen:
                continue
            # word-boundary match in both directions
            if _skill_patterns[skill].search(item) or re.search(
                r'\b' + re.escape(item) + r'\b', skill
            ):
                domain = _skill_to_domain.get(skill, "unknown")
                matched.setdefault(domain, []).append(skill)
                seen.add(skill)
    return matched


def batch_extract(df: pd.DataFrame, text_col: str) -> list[dict]:
    """
    Run extract_from_text on every row of df[text_col].
    Returns [{"candidate_id": row_index, "skills_by_domain": {...}}, ...]
    """
    results = []
    for idx, row in df.iterrows():
        results.append({
            "candidate_id": idx,
            "skills_by_domain": extract_from_text(str(row[text_col])),
        })
    return results


# ── smoke test ────────────────────────────────────────────────────────────────

def _extract_substring(text: str) -> dict[str, list[str]]:
    """Old plain-substring version used only for before/after comparison."""
    _init()
    text_lower = text.lower()
    matched: dict[str, list[str]] = {}
    for skill in _all_skills:
        if skill in text_lower:
            domain = _skill_to_domain.get(skill, "unknown")
            matched.setdefault(domain, []).append(skill)
    return matched


if __name__ == "__main__":
    DATA = Path(__file__).parent / "data"
    resumes = pd.read_csv(DATA / "training_data.csv")

    # ── before / after comparison ─────────────────────────────────────────────
    print("=" * 70)
    print("BEFORE (substring)  vs  AFTER (word-boundary) — first 5 resumes")
    print("=" * 70)

    for idx, row in resumes.head(5).iterrows():
        text = str(row["Resume Text"])
        before = _extract_substring(text)
        after  = extract_from_text(text)

        before_skills = sorted({s for v in before.values() for s in v})
        after_skills  = sorted({s for v in after.values()  for s in v})
        dropped = sorted(set(before_skills) - set(after_skills))

        print(f"\n[candidate_id={idx}]")
        print(f"  skills before : {len(before_skills):>3}  {before_skills}")
        print(f"  skills after  : {len(after_skills):>3}  {after_skills}")
        if dropped:
            print(f"  dropped (false positives): {dropped}")
        else:
            print(f"  dropped (false positives): none")

    # ── word-boundary results ─────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("batch_extract (word-boundary) — first 5 resumes")
    print("=" * 70)

    results = batch_extract(resumes.head(5), "Resume Text")
    for r in results:
        print(f"\n[candidate_id={r['candidate_id']}]")
        for domain, skills in r["skills_by_domain"].items():
            print(f"  {domain:<30} {skills}")

    # ── extract_from_skill_string unchanged ───────────────────────────────────
    print("\n" + "=" * 70)
    print("extract_from_skill_string — first 3 job postings")
    print("=" * 70)

    jobs = pd.read_csv(DATA / "all_job_post.csv")
    for idx, row in jobs.head(3).iterrows():
        print(f"\n[job_id={row['job_id']}  title={row['job_title']}]")
        extracted = extract_from_skill_string(row["job_skill_set"])
        for domain, skills in extracted.items():
            print(f"  {domain:<30} {skills}")
