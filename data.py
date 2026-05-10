import pandas as pd
import json

data_dir = "backend/data"
files = [
    "all_job_post.csv",
    "job_roles.csv",
    "resume_data_for_ranking.csv",
    "training_data.csv",
    "skills_list.csv",
]

for f in files:
    path = f"{data_dir}/{f}"
    df = pd.read_csv(path, nrows=2)
    full = pd.read_csv(path)
    print(f"\n{'='*50}")
    print(f"FILE: {f}")
    print(f"Shape: {full.shape}")
    print(f"Columns: {full.columns.tolist()}")
    print(df.head(1).to_string())

# JSONL file
print(f"\n{'='*50}")
print("FILE: resumes_dataset.jsonl")
with open(f"{data_dir}/resumes_dataset.jsonl", "r", encoding="utf-8") as f:
    lines = [json.loads(f.readline()) for _ in range(3)]
print(f"Keys in first record: {list(lines[0].keys())}")
print(f"Sample: {str(lines[0])[:300]}")

# skills_database.json
print(f"\n{'='*50}")
print("FILE: skills_database.json")
with open(f"{data_dir}/skills_database.json", "r") as f:
    print(json.dumps(json.load(f), indent=2)[:500])