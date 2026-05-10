import json
from pathlib import Path

TAXONOMY_PATH = Path(__file__).parent / "data" / "skills_database.json"

# Old domain key → canonical key (skills are unioned into the target domain)
_DOMAIN_ALIASES: dict[str, str] = {
    "Database":    "databases",
    "Soft Skills": "soft_skills",
}

# Skills inside "Cloud & DevOps" that belong to the cloud domain.
# Everything else in that domain goes to devops.
_CLOUD_DEVOPS_TO_CLOUD: set[str] = {
    "aws", "azure", "gcp", "cloudformation", "serverless",
}

# Skills to inject when a domain is absent from the JSON file
_MISSING_DOMAINS: dict[str, list[str]] = {
    "devops": [
        "docker", "kubernetes", "ci/cd", "jenkins", "terraform", "ansible",
        "git", "github actions", "gitlab ci", "circleci", "helm", "prometheus",
        "grafana", "elk stack", "puppet", "chef", "vagrant",
        "linux administration", "bash scripting", "nginx", "apache",
    ],
    "cloud": [
        "aws", "azure", "gcp", "aws lambda", "s3", "ec2", "rds",
        "cloudformation", "azure devops", "google cloud storage", "cloud run",
        "firebase", "heroku", "digitalocean", "cloudflare", "load balancing",
        "auto scaling", "vpc", "iam", "serverless",
    ],
    "databases": [
        "sql", "mysql", "postgresql", "mongodb", "oracle", "cassandra", "redis",
        "database design", "query optimization", "nosql", "sqlite", "dynamodb",
        "elasticsearch", "neo4j", "mariadb", "couchdb", "influxdb", "hbase",
        "data warehousing", "etl",
    ],
    "algorithms": [
        "sorting algorithms", "dynamic programming", "graph algorithms",
        "data structures", "binary search", "recursion", "big-o notation",
        "complexity analysis", "greedy algorithms", "divide and conquer",
        "backtracking", "tree traversal", "hashing", "linked lists", "stacks",
        "queues", "heaps", "binary trees", "trie", "bfs", "dfs",
        "breadth first search", "depth first search",
    ],
    "data_science": [
        "machine learning", "deep learning", "tensorflow", "pytorch",
        "scikit-learn", "data analysis", "statistics", "pandas", "numpy",
        "tableau", "power bi", "jupyter", "data visualization", "nlp",
        "natural language processing", "computer vision", "feature engineering",
        "model evaluation", "neural networks", "keras", "xgboost",
        "a/b testing", "hypothesis testing", "regression", "classification",
        "clustering", "dimensionality reduction", "pca", "random forest",
        "gradient boosting",
    ],
    "soft_skills": [
        "leadership", "communication", "problem solving", "critical thinking",
        "teamwork", "time management", "adaptability", "creativity",
        "negotiation", "mentoring", "project management", "strategic planning",
        "decision making", "collaboration", "presentation skills",
        "conflict resolution", "emotional intelligence", "active listening",
        "networking",
    ],
}


def load_taxonomy() -> dict:
    with open(TAXONOMY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_all_skills(taxonomy: dict | None = None) -> list[str]:
    if taxonomy is None:
        taxonomy = load_taxonomy()
    seen: set[str] = set()
    skills: list[str] = []
    for skill_list in taxonomy.values():
        for s in skill_list:
            if s not in seen:
                seen.add(s)
                skills.append(s)
    return skills


def get_domain(skill: str, taxonomy: dict | None = None) -> str:
    if taxonomy is None:
        taxonomy = load_taxonomy()
    skill_lower = skill.lower()
    for domain, skills in taxonomy.items():
        if skill_lower in skills:
            return domain
    return "unknown"


# ── internal helpers ──────────────────────────────────────────────────────────

def _normalize(taxonomy: dict) -> dict:
    """Lowercase all skill strings and deduplicate within each domain."""
    result: dict[str, list[str]] = {}
    for domain, skills in taxonomy.items():
        seen: set[str] = set()
        unique: list[str] = []
        for s in skills:
            sl = s.lower()
            if sl not in seen:
                seen.add(sl)
                unique.append(sl)
        result[domain] = unique
    return result


def _extend(taxonomy: dict) -> tuple[dict, list[str]]:
    """Add missing domains; return updated taxonomy and list of added domain names."""
    existing_lower = {k.lower() for k in taxonomy}
    added: list[str] = []
    for domain, skills in _MISSING_DOMAINS.items():
        if domain not in existing_lower:
            taxonomy[domain] = skills
            added.append(domain)
    return taxonomy, added


def _merge_domains(taxonomy: dict) -> dict:
    """Collapse legacy/alias domain keys into their canonical lowercase equivalents."""
    # Simple 1:1 merges (e.g. "Database" → "databases")
    for old_key, new_key in _DOMAIN_ALIASES.items():
        if old_key in taxonomy:
            merged = set(taxonomy.get(new_key, [])) | set(taxonomy.pop(old_key))
            taxonomy[new_key] = sorted(merged)

    # Split "Cloud & DevOps" into "cloud" and "devops"
    if "Cloud & DevOps" in taxonomy:
        legacy = set(taxonomy.pop("Cloud & DevOps"))
        cloud_skills  = set(taxonomy.get("cloud",  []))
        devops_skills = set(taxonomy.get("devops", []))
        for skill in legacy:
            if skill in _CLOUD_DEVOPS_TO_CLOUD:
                cloud_skills.add(skill)
            else:
                devops_skills.add(skill)
        taxonomy["cloud"]  = sorted(cloud_skills)
        taxonomy["devops"] = sorted(devops_skills)

    return taxonomy


def _save(taxonomy: dict) -> None:
    with open(TAXONOMY_PATH, "w", encoding="utf-8") as f:
        json.dump(taxonomy, f, indent=2, ensure_ascii=False)


# ── entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    taxonomy = load_taxonomy()

    taxonomy, added_domains = _extend(taxonomy)
    taxonomy = _normalize(taxonomy)
    taxonomy = _merge_domains(taxonomy)

    _save(taxonomy)

    print("=== Taxonomy Summary ===\n")
    total_skills = 0
    for domain, skills in taxonomy.items():
        count = len(skills)
        total_skills += count
        print(f"  {domain:<30} {count:>3} skills")

    all_unique = get_all_skills(taxonomy)
    print(f"\n  {'TOTAL domains':<30} {len(taxonomy):>3}")
    print(f"  {'TOTAL unique skills':<30} {len(all_unique):>3}")

    if added_domains:
        print(f"\nNewly added domains : {', '.join(added_domains)}")
    else:
        print("\nNo new domains added (all were already present).")
