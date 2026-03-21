import uuid

from fastapi import BackgroundTasks, FastAPI, HTTPException

from api.jobs import get_job, list_jobs, save_job
from api.models import GenerateRequest, Job
from api.runner import run_design_agent

OUTPUTS_ROOT = "/outputs/users"

app = FastAPI(title="RFdiffusion Chat API")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/generate")
def generate(request: GenerateRequest, background_tasks: BackgroundTasks):
    job = create_job_from_request(request)
    save_job(job)
    background_tasks.add_task(run_design_agent, job)
    return job


@app.get("/jobs")
def get_jobs(user_id: str | None = None):
    return list_jobs(user_id)


@app.get("/jobs/{job_id}")
def get_job_by_id(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def create_job_from_request(request: GenerateRequest) -> Job:
    job_id = uuid.uuid4().hex[:12]
    output_dir = f"{OUTPUTS_ROOT}/{request.user_id}/{request.chat_id}/{job_id}"
    return Job(
        job_id=job_id,
        user_id=request.user_id,
        chat_id=request.chat_id,
        prompt=request.prompt,
        max_iterations=request.max_iterations,
        output_dir=output_dir,
        pdb=request.pdb,
    )


