# SkillGraph

SkillGraph is a resume intelligence application for ranking candidates against a selected job description. It combines skill extraction, graph-based scoring, gap analysis, and a dark RPG-terminal style React interface.

## Features

### Backend API

FastAPI backend in `backend/main.py`. Loads job descriptions, resume datasets, skill taxonomy, and graph data at startup.

| Endpoint | Method | Description |
|---|---|---|
| `/jd_list` | GET | Returns job descriptions for the JD picker |
| `/rank` | POST | Ranks submitted resumes against a selected JD |
| `/graph` | POST | Returns a candidate skill ego graph after ranking |
| `/proficiency` | POST | Returns a scenario-based diagnostic question for a skill |
| `/sessions` | POST | Saves a ranking session (keeps last 25) |
| `/sessions` | GET | Lists all saved session summaries |
| `/sessions/{session_id}` | GET | Retrieves a specific session with full ranking data |

### Ranking Engine

- Extracts skills from resume text and JD skill strings.
- Scores candidates using semantic similarity, graph distance, and propagation score.
- Assigns grades `A/B/C/D` by percentile.
- Returns matched skills, missing skills, dominant signal, score breakdown, and candidate skill inventory.

### Graph and Gap Analysis

- Builds a resume co-occurrence graph with NetworkX.
- Builds a taxonomy knowledge graph.
- Computes learning gaps between the candidate's current grade and the next grade.
- Produces learning paths for missing skills where reachable in the graph.

### Frontend

React + Vite frontend in `frontend/`. Tailwind CSS v4 with shadcn UI components. Dark-mode data intelligence UI using Outfit and Space Mono fonts. Vite proxy configured so frontend API calls use `/api/*`.

## Application Routes

- `/` — Landing page with product overview, architecture breakdown, and feature cards.
- `/app` — Main application interface.

## Frontend Views

**Home view**
- Searchable JD picker with category badges (Technology, HR, Finance, Sales, etc.) using shadcn Command + Popover.
- Resume input with candidate queue management (add / remove candidates before ranking).
- Rank action with loading overlay.
- Saved ranking sessions panel with restore from Home.
- Character HUD panel: level (1–10 based on score), animated hexagons, grade badge, score bar, and skill coverage percentage. Shows a safe placeholder if `public/model.glb` is missing.

**Rankings view**
- Sorted candidate ranking cards with grade accent bars.
- Match score progress bar.
- Semantic / distance / propagation signal bars.
- Acquired and missing skill chips.
- Compare selection with a maximum of two candidates.

**Skill graph view**
- D3 force-directed skill graph with domain color coding (ml, frontend, backend, devops, databases, soft_skills, algorithms, data_science).
- JD-matched skills highlighted with white stroke; missing skills shown with red dashed outline.
- Zoom, pan, drag, and tooltip interactions.
- Gap panel with learning paths to the next grade.
- Proficiency diagnostic modal: scenario-based question with text response input; 50+ character answer counts as a pass, with a confetti burst on success.

**Compare view**
- Candidate A vs. candidate B side-by-side comparison.
- Skill intersection layout: unique to A / shared / unique to B.
- Recommendation verdict based on final score and strongest signal delta.

## Tech Stack

- **Backend:** Python, FastAPI, pandas, NetworkX, Pydantic
- **Frontend:** React 19, React Router 7, Vite 8, Tailwind CSS v4, shadcn UI
- **Visualization:** D3 (force-directed graphs, zoom/pan)
- **Animation:** GSAP (view transitions), CSS animations
- **HTTP:** axios
- **Icons:** lucide-react

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

Open `http://127.0.0.1:5173`.

## API Proxy

The Vite dev server rewrites `/api/*` to `http://localhost:8000`, so the frontend calls:

- `/api/jd_list`
- `/api/rank`
- `/api/graph`
- `/api/proficiency`
- `/api/sessions`

## Known Notes

- `frontend/public/model.glb` is not included. The character HUD safely shows an `AWAITING_AGENT.glb` placeholder until that asset is added.
- Vite may warn about large chunks because D3 is bundled. This is not a runtime error.
- Backend startup may emit Hugging Face cache warnings depending on local cache permissions.
- Three.js, `@react-three/fiber`, and `@react-three/drei` are installed as dependencies for the planned 3D character model but are not currently used at runtime.
