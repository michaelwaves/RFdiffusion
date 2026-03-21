# RFdiffusion Chat API — Plan

## Overview

A FastAPI server that acts as a **Claude Agent subagent** — it receives natural language protein design requests from a Next.js chat frontend (via Vercel AI SDK), translates them into RFdiffusion runs using Claude Agent SDK, and manages jobs + artifacts.

---

## Architecture

```
Next.js Frontend (Vercel AI SDK chat)
  │
  ▼
FastAPI Server (this)
  ├── POST /generate       — accept natural language prompt, queue a background job
  ├── GET  /jobs           — list jobs for a user (+ statuses)
  ├── GET  /jobs/{job_id}  — job detail: status, artifacts, iterations
  └── GET  /jobs/{job_id}/artifacts/{filename} — serve PDB/image files
  │
  ▼  (background task)
Claude Agent SDK
  ├── interprets user prompt
  ├── maps to RFdiffusion run_inference.py commands
  ├── executes via Bash tool
  ├── renders + reviews output (VLM loop)
  └── iterates up to max_iterations
  │
  ▼
/outputs/users/{user_id}/{chat_id}/{job_id}/
  ├── v0/ v1/ v2/ ...   (iteration directories — enables "time travel")
  │   ├── design_0.pdb
  │   ├── design_0.trb
  │   ├── traj/
  │   └── render.png     (Claude-generated visualization)
  └── job.json           (metadata: prompt, status, timestamps, iterations)
```

---

## Data Models

### Request
```python
class GenerateRequest(BaseModel):
    prompt: str                          # natural language design request
    user_id: str = "anonymous"           # UUID from BetterAuth
    chat_id: str = "default"             # conversation ID
    pdb: str | None = None               # optional input PDB content (scaffolding/motif)
    max_iterations: int = 3              # VLM review loop cap
```

### Job (internal state)
```python
class Job(BaseModel):
    job_id: str                          # UUID
    user_id: str
    chat_id: str
    prompt: str
    status: Literal["queued", "running", "completed", "failed"]
    current_iteration: int = 0
    max_iterations: int
    created_at: datetime
    updated_at: datetime
    output_dir: str
    error: str | None = None
```

---

## Implementation Steps

### Step 1 — FastAPI skeleton + job store
- Pydantic models for request/response
- In-memory job dict (swap for DB later)
- Endpoints: `POST /generate`, `GET /jobs`, `GET /jobs/{job_id}`
- `POST /generate` creates a job, kicks off `BackgroundTasks`
- Static file serving for artifacts

### Step 2 — Claude Agent SDK integration
- Background task function that:
  1. Builds a system prompt with RFdiffusion context (config schema, example commands, contig syntax)
  2. Passes the user's natural language prompt
  3. Gives Claude tools: `Bash`, `Read`, `Edit` (scoped to output dir) Wait it needs bash access in all directories?
  4. Claude translates prompt → `run_inference.py` command with correct args
  5. Streams agent messages, updates job status

### Step 3 — System prompt / prompt engineering
Key context to inject into Claude agent:
- **Contig syntax**: `[100-200]` for unconditional, `[A1-150/0 70-100]` for binder, `[10-40/A163-181/10-40]` for motif scaffolding
- **Available config overrides**: from `config/inference/base.yaml` — the full schema
- **Example commands**: all the shell scripts from `examples/`
- **Output path convention**: always set `inference.output_prefix` to the job's output dir
- **Input PDB handling**: if user provides a PDB, save it to the job dir and reference it via `inference.input_pdb`
- **Design count**: default `inference.num_designs=1` per iteration (keep it fast for chat)
- **Guard rails**: don't exceed max_iterations, always output to the correct directory

### Step 4 — VLM iteration loop
After each RFdiffusion run:
1. Render the PDB to an image (PyMOL or `py3Dmol` headless screenshot)
2. Show Claude the rendered image
3. Claude evaluates: does this match the user's intent?
4. If not satisfied and iterations remain → Claude adjusts params and re-runs
5. Each iteration saves to `v{n}/` subdirectory

### Step 5 — Artifact serving & job management
- `GET /jobs/{job_id}/artifacts/{path}` serves files from job output dir
- List iterations with their artifacts for "time travel" UI
- Endpoint to cancel a running job

---

## Key Decisions & Open Questions

| Decision | Current Choice | Rationale |
|----------|---------------|-----------|
| Job store | In-memory dict | Good enough for v0; swap for SQLite/Redis later |
| PDB rendering | PyMOL CLI or py3Dmol | Need headless rendering for VLM loop — TBD what's available |
| Agent scoping | Bash + Read tools | Claude needs shell access to run `run_inference.py` via hydra |
| Output structure | `/outputs/users/{uid}/{cid}/{jid}/v{n}/` | Supports time-travel, per-user isolation |
| Num designs per iteration | 1 | Keep feedback loop fast; user can request more |

### Open questions
1. **PDB rendering** — what's installed for headless rendering? PyMOL? Need to check.
2. **Auth** — for now user_id is trusted from request body; real auth comes from BetterAuth in frontend later.
3. **Concurrency** — how many GPU jobs can run simultaneously? Probably 1 at a time → need a proper queue (even just asyncio.Queue for v0).
4. **Model weights** — are all checkpoint files available? (base, ActiveSite_ckpt, etc.)

---

## File Structure (target)
```
api/
├── server.py              # FastAPI app, endpoints, background task runner
├── agent.py               # Claude Agent SDK wrapper, system prompt, iteration loop
├── models.py              # Pydantic models (or keep inline in server.py for now)
├── plan.md                # this file
└── CLAUDE.md              # project context
```

---

## Next Steps
1. Build out `server.py` with endpoints + job store
2. Write the Claude agent system prompt with RFdiffusion knowledge
3. Wire up the background task
4. Test with a simple unconditional generation prompt
