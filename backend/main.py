from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
import time
from pathlib import Path
import sys
from uuid import uuid4

import networkx as nx
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.taxonomy import load_taxonomy
from backend.extraction import batch_extract, extract_from_skill_string, extract_from_text
from backend.graph import build_resume_graph, build_knowledge_graph, graph_to_dict
from backend.ranking import rank_candidates, _flatten
from backend.gap import get_grade_skill_profiles, compute_gap

DATA = Path(__file__).parent / "data"
SESSIONS_FILE = DATA / "ranking_sessions.json"

# ── proficiency scenarios ─────────────────────────────────────────────────────

_SCENARIOS: dict[str, dict] = {
    "python": {
        "scenario":    "You are building a pipeline that processes 1 million daily log entries from cloud storage.",
        "question":    "How would you design this in Python? Which libraries and patterns keep memory usage low at scale?",
        "pass_criteria": "Mentions generators/streaming for memory efficiency, Pandas or Polars for transforms, retry/error handling, logging, and possibly asyncio or multiprocessing for throughput.",
    },
    "sql": {
        "scenario":    "A critical dashboard query runs for 45 seconds on a 50-million-row transactions table.",
        "question":    "Walk through how you would diagnose and optimise this query.",
        "pass_criteria": "Covers EXPLAIN/query plan, composite/covering indexes, partition pruning, avoiding SELECT *, CTE vs derived table trade-offs, and before/after benchmarking.",
    },
    "react": {
        "scenario":    "A React search component re-renders on every keystroke, causing visible lag.",
        "question":    "How do you diagnose the root cause and fix the performance problem?",
        "pass_criteria": "Mentions React DevTools profiler, useMemo/useCallback, debouncing the input handler, checking unstable object references or missing dependency arrays.",
    },
    "machine learning": {
        "scenario":    "Your fraud-detection classifier reports 99% accuracy but the fraud team says it misses too many cases.",
        "question":    "What is likely wrong, and how would you evaluate and improve the model?",
        "pass_criteria": "Identifies class imbalance, references precision/recall/F1 and ROC-AUC over raw accuracy, discusses threshold tuning, SMOTE or cost-sensitive loss, confusion matrix analysis.",
    },
    "docker": {
        "scenario":    "A containerised service works locally but crashes in production with an out-of-memory error.",
        "question":    "How do you investigate and resolve this?",
        "pass_criteria": "Mentions docker stats/inspect, --memory resource limits, application-level memory leak hunting, multi-stage builds to reduce image size, environment-specific config.",
    },
    "communication": {
        "scenario":    "You must brief non-technical stakeholders 30 minutes after a production incident resolves.",
        "question":    "How do you structure and deliver this message?",
        "pass_criteria": "Plain-language summary of what happened, who was impacted and for how long, immediate fix, concrete prevention steps. Avoids jargon and takes clear ownership.",
    },
}

_GENERIC = {
    "scenario":     "You are working on a team project and asked to demonstrate proficiency in {skill}.",
    "question":     "Describe a real situation where you applied {skill} to solve a non-trivial problem. What was the context, your approach, and the result?",
    "pass_criteria": "Includes a specific problem context, concrete steps using {skill}, measurable or observable outcomes, and trade-offs considered.",
}


def _read_sessions() -> list[dict]:
    if not SESSIONS_FILE.exists():
        return []
    try:
        return json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def _write_sessions(sessions: list[dict]) -> None:
    SESSIONS_FILE.write_text(json.dumps(sessions, indent=2), encoding="utf-8")


def _session_summary(session: dict) -> dict:
    ranked = session.get("result", {}).get("ranked", [])
    return {
        "id": session["id"],
        "created_at": session["created_at"],
        "job_title": session.get("selected_job", {}).get("job_title", ""),
        "candidate_count": len(ranked),
        "top_candidate_id": ranked[0].get("candidate_id", "") if ranked else "",
        "top_score": ranked[0].get("final_score", 0) if ranked else 0,
    }


def _hydrate_skill_cache(app: FastAPI, ranked: list[dict]) -> None:
    for candidate in ranked:
        candidate_id = candidate.get("candidate_id")
        skills = candidate.get("all_skills")
        if candidate_id and isinstance(skills, list):
            app.state.skill_cache[candidate_id] = skills


# ── lifespan: load everything once ───────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    t0 = time.perf_counter()

    def elapsed(since: float) -> str:
        return f"{time.perf_counter() - since:.1f}s"

    print("[startup] Loading taxonomy...")
    taxonomy = load_taxonomy()

    # ── extract skills from all 10k resumes ──────────────────────────────────
    print("[startup] Extracting skills from 10 000 resumes (regex only, no SBERT)...")
    t1 = time.perf_counter()
    resumes = pd.read_csv(DATA / "training_data.csv")
    all_candidates = batch_extract(resumes, "Resume Text")
    print(f"[startup]   {len(all_candidates)} candidates  ({elapsed(t1)})")

    # ── full co-occurrence graph ──────────────────────────────────────────────
    print("[startup] Building co-occurrence graph...")
    t2 = time.perf_counter()
    G = build_resume_graph(all_candidates)
    print(f"[startup]   {G.number_of_nodes()} nodes, {G.number_of_edges()} edges  ({elapsed(t2)})")

    # ── knowledge graph ───────────────────────────────────────────────────────
    print("[startup] Building knowledge graph...")
    t3 = time.perf_counter()
    KG = build_knowledge_graph(taxonomy)
    print(f"[startup]   {KG.number_of_nodes()} nodes, {KG.number_of_edges()} edges  ({elapsed(t3)})")

    # ── baseline grade profiles (100 Technology resumes × 1 tech JD) ─────────
    print("[startup] Building baseline grade profiles...")
    t4 = time.perf_counter()
    jobs    = pd.read_csv(DATA / "all_job_post.csv")
    jd_row  = jobs[
        jobs["job_title"].str.contains("Software Engineer", case=False, na=False)
    ].iloc[0]
    baseline_jd_skills = _flatten(extract_from_skill_string(jd_row["job_skill_set"]))

    baseline_df = (
        resumes[resumes["Category"] == "Technology"]
        .head(100)
        .reset_index(drop=True)
    )
    baseline_candidates = batch_extract(baseline_df, "Resume Text")
    baseline_G          = build_resume_graph(baseline_candidates)
    baseline_ranked     = rank_candidates(baseline_candidates, baseline_jd_skills, baseline_G)
    grade_profiles      = get_grade_skill_profiles(baseline_ranked, baseline_G)
    print(f"[startup]   Grade profiles done  ({elapsed(t4)})")

    jd_list = (
        jobs[["job_id", "job_title", "category", "job_skill_set"]]
        .fillna("")
        .to_dict(orient="records")
    )

    print(f"[startup] TOTAL startup time: {elapsed(t0)}")

    app.state.taxonomy        = taxonomy
    app.state.graph           = G
    app.state.knowledge_graph = KG
    app.state.grade_profiles  = grade_profiles
    app.state.jd_list         = jd_list
    app.state.skill_cache     = {}   # candidate_id -> flat skill list (populated by /rank)

    yield   # ── server is running ─────────────────────────────────────────────


# ── app ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="SkillGraph API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── request / response models ─────────────────────────────────────────────────

class ResumeInput(BaseModel):
    id: str
    text: str

class RankRequest(BaseModel):
    resumes: list[ResumeInput]
    jd_skill_string: str

class GraphRequest(BaseModel):
    candidate_id: str
    jd_skills: list[str] = []

class ProficiencyRequest(BaseModel):
    skill: str

class SelectedJob(BaseModel):
    job_title: str
    job_skill_set: str

class SaveSessionRequest(BaseModel):
    selected_job: SelectedJob
    resumes: list[ResumeInput]
    result: dict


# ── endpoints ─────────────────────────────────────────────────────────────────

@app.post("/rank")
def rank(req: RankRequest):
    """
    Rank a batch of resumes against a job description.

    Extracts skills from each resume text and from the JD skill string,
    scores with all three signals, grades by percentile within this pool,
    runs gap analysis against the pre-loaded baseline profiles, and returns
    a merged ranked list.
    """
    if not req.resumes:
        raise HTTPException(status_code=400, detail="resumes list is empty")

    G: nx.Graph = app.state.graph

    candidates = [
        {
            "candidate_id":   r.id,
            "skills_by_domain": extract_from_text(r.text),
        }
        for r in req.resumes
    ]

    jd_skills = _flatten(extract_from_skill_string(req.jd_skill_string))

    ranked = rank_candidates(candidates, jd_skills, G)

    # cache skills for /graph lookups
    for r in ranked:
        app.state.skill_cache[r["candidate_id"]] = r["all_skills"]

    # gap against the stable baseline profiles
    gaps = [
        compute_gap(r, app.state.grade_profiles, G)
        for r in ranked
    ]

    merged = [{**r, "gap": g} for r, g in zip(ranked, gaps)]
    return {"ranked": merged}


@app.post("/sessions")
def save_session(req: SaveSessionRequest):
    ranked = req.result.get("ranked", [])
    if not ranked:
        raise HTTPException(status_code=400, detail="result.ranked is required")

    session = {
        "id": uuid4().hex,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "selected_job": req.selected_job.dict(),
        "resumes": [resume.dict() for resume in req.resumes],
        "result": req.result,
    }

    sessions = _read_sessions()
    sessions.insert(0, session)
    _write_sessions(sessions[:25])
    _hydrate_skill_cache(app, ranked)
    return {"session": _session_summary(session)}


@app.get("/sessions")
def list_sessions():
    return {"sessions": [_session_summary(session) for session in _read_sessions()]}


@app.get("/sessions/{session_id}")
def get_session(session_id: str):
    for session in _read_sessions():
        if session["id"] == session_id:
            _hydrate_skill_cache(app, session.get("result", {}).get("ranked", []))
            return {"session": session}
    raise HTTPException(status_code=404, detail="session not found")


@app.post("/graph")
def subgraph(req: GraphRequest):
    """
    Return the ego subgraph of a candidate's skills from the full graph.
    Optionally include JD skill nodes to show overlap.
    Candidate must have been ranked via /rank first.
    """
    G: nx.Graph = app.state.graph
    skills = app.state.skill_cache.get(req.candidate_id)

    if skills is None:
        raise HTTPException(
            status_code=404,
            detail=f"Candidate '{req.candidate_id}' not found. Call /rank first.",
        )

    nodes_of_interest = set(skills) | set(req.jd_skills)
    nodes_in_G        = [n for n in nodes_of_interest if n in G]

    if not nodes_in_G:
        return {"nodes": [], "edges": []}

    return graph_to_dict(G.subgraph(nodes_in_G))


@app.get("/jd_list")
def jd_list():
    """Return all job postings for the JD picker in the frontend."""
    return {"jobs": app.state.jd_list}


@app.post("/proficiency")
def proficiency(req: ProficiencyRequest):
    """
    Return a scenario-based proficiency question for a skill.
    Hardcoded for 6 common skills; generic template for all others.
    """
    skill = req.skill.strip().lower()
    sc    = _SCENARIOS.get(skill, None)

    if sc:
        return {
            "skill":         skill,
            "scenario":      sc["scenario"],
            "question":      sc["question"],
            "pass_criteria": sc["pass_criteria"],
        }

    return {
        "skill":         skill,
        "scenario":      _GENERIC["scenario"].format(skill=skill),
        "question":      _GENERIC["question"].format(skill=skill),
        "pass_criteria": _GENERIC["pass_criteria"].format(skill=skill),
    }


# ── dev entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
