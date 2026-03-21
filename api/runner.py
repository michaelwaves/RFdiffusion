import os
from datetime import datetime

from claude_agent_sdk import ClaudeAgentOptions, ResultMessage, query

from api.agent import REPO_ROOT, build_system_prompt, build_user_prompt
from api.jobs import save_job
from api.models import Job


async def run_design_agent(job: Job) -> None:
    update_job_status(job, "running")
    try:
        input_pdb_path = save_input_pdb_if_provided(job)
        await invoke_claude_agent(job, input_pdb_path)
        update_job_status(job, "completed")
    except Exception as error:
        update_job_status(job, "failed", error=str(error))


async def invoke_claude_agent(job: Job, input_pdb_path: str | None = None) -> None:
    options = ClaudeAgentOptions(
        system_prompt=build_system_prompt(),
        allowed_tools=["Bash", "Read", "Edit"],
        cwd=REPO_ROOT,
        max_turns=job.max_iterations * 10,
        permission_mode="bypassPermissions",
    )
    user_prompt = build_user_prompt(job, input_pdb_path)

    async for message in query(prompt=user_prompt, options=options):
        if isinstance(message, ResultMessage) and message.is_error:
            raise RuntimeError(message.result or "Agent failed")


def update_job_status(job: Job, status: str, error: str | None = None) -> None:
    job.status = status
    job.updated_at = datetime.now()
    if error:
        job.error = error
    save_job(job)


def save_input_pdb_if_provided(job: Job) -> str | None:
    if not job.pdb:
        return None
    os.makedirs(job.output_dir, exist_ok=True)
    path = f"{job.output_dir}/input.pdb"
    with open(path, "w") as f:
        f.write(job.pdb)
    return path
