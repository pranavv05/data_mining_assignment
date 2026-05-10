# SkillGraph

SkillGraph is a resume intelligence application for ranking candidates against a selected job description. It combines skill extraction, graph-based scoring, gap analysis, and a dark RPG-terminal style React interface.

## Current Features

### Backend API

- FastAPI backend in `backend/main.py`.
- Loads job descriptions, resume datasets, skill taxonomy, and graph data at startup.
- `GET /jd_list`: returns job descriptions for the frontend JD picker.
- `POST /rank`: ranks submitted resumes against a selected JD skill string.
- `POST /graph`: returns a candidate skill ego graph after ranking.
- `POST /proficiency`: returns a scenario-based diagnostic question for a skill.

### Ranking Engine

- Extracts skills from resume text and JD skill strings.
- Scores candidates using:
  - semantic similarity
  - graph distance
  - propagation score
- Assigns grades `A/B/C/D` by percentile.
- Returns matched skills, missing skills, dominant signal, score breakdown, and candidate skill inventory.

### Graph and Gap Analysis

- Builds a resume co-occurrence graph with NetworkX.
- Builds a taxonomy knowledge graph.
- Computes learning gaps between the candidate's current grade and the next grade.
- Produces learning paths for missing skills where reachable in the graph.

### Frontend

- React + Vite frontend in `frontend/`.
- Tailwind CSS v4 with shadcn UI components.
- Dark-mode data intelligence UI using Outfit and Space Mono fonts.
- Vite proxy configured so frontend API calls use `/api/*`.

### Frontend Screens

- Home view:
  - searchable JD picker using shadcn Command + Popover
  - resume input and candidate queue
  - rank action with loading overlay
  - character/HUD panel with safe placeholder if `public/model.glb` is missing

- Rankings view:
  - sorted candidate ranking cards
  - grade accent bars
  - match score progress
  - semantic/distance/propagation signal bars
  - acquired and missing skill chips
  - compare selection with a maximum of two candidates

- Skill graph view:
  - D3 force-directed skill graph
  - JD match and missing skill styling
  - zoom, pan, drag, tooltip
  - gap panel with learning paths and skill diagnostics

- Compare view:
  - candidate A vs candidate B comparison
  - unique/shared skill intersection
  - recommendation verdict based on final score and strongest signal delta

## Tech Stack

- Backend: Python, FastAPI, pandas, NetworkX, Pydantic
- Frontend: React, Vite, Tailwind CSS, shadcn UI
- Visualization: D3, Three.js, `@react-three/fiber`, `@react-three/drei`
- Animation: GSAP, CSS animations

## Running Locally

### Backend

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

The backend can take some time to start because it loads datasets, taxonomy, graph structures, and ML-related resources.

### Frontend

```bash
cd frontend
npm install
npm run dev -- --port 5173
```

Open:

```text
http://127.0.0.1:5173
```

## API Proxy

The frontend calls:

- `/api/jd_list`
- `/api/rank`
- `/api/graph`
- `/api/proficiency`

Vite rewrites `/api/*` to the backend at `http://localhost:8000`.

## Known Notes

- `frontend/public/model.glb` is not included yet. The UI safely shows an `AWAITING_AGENT.glb` placeholder until that asset is added.
- Vite may warn about large chunks because D3 and Three.js are bundled. This is not currently a runtime error.
- Backend startup may emit Hugging Face cache warnings depending on local cache permissions.

## Suggested Remaining Work

- Add a real `frontend/public/model.glb` character model.
- Add persistent storage for ranked sessions and candidate uploads.
- Add a dedicated results page for exporting rankings.
- Improve compare view with domain-aware skill coloring from backend metadata.
- Add authentication if this is deployed beyond local demo use.
- Add automated backend tests for `/rank`, `/graph`, and `/proficiency`.
- Add frontend tests for JD loading, candidate queueing, ranking, and compare selection.
- Add route/deep-link support instead of state-only view switching.
