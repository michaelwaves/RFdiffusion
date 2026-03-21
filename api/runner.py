import logging
import os
from datetime import datetime

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ResultMessage,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
    query,
)

from api.agent import REPO_ROOT, build_system_prompt, build_user_prompt
from api.jobs import save_job
from api.models import Job

log = logging.getLogger(__name__)


async def run_design_agent(job: Job) -> None:
    update_job_status(job, "running")
    try:
        os.makedirs(job.output_dir, exist_ok=True)
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

    log.info(f"[{job.job_id}] Starting agent for: {job.prompt}")

    async for message in query(prompt=user_prompt, options=options):
        log_agent_message(job.job_id, message)
        if isinstance(message, ResultMessage) and message.is_error:
            raise RuntimeError(message.result or "Agent failed")


def update_job_status(job: Job, status: str, error: str | None = None) -> None:
    job.status = status
    job.updated_at = datetime.now()
    if error:
        job.error = error
    save_job(job)


def log_agent_message(job_id: str, message) -> None:
    tag = f"[{job_id}]"

    if isinstance(message, AssistantMessage):
        for block in message.content:
            if isinstance(block, TextBlock):
                log.info(f"{tag} 💬 {block.text[:200]}")
            elif isinstance(block, ToolUseBlock):
                log.info(f"{tag} 🔧 {block.name}({_summarize_input(block.input)})")
            elif isinstance(block, ToolResultBlock):
                preview = str(block.content)[:150] if block.content else ""
                status = "❌" if block.is_error else "✅"
                log.info(f"{tag} {status} {preview}")

    elif isinstance(message, ResultMessage):
        log.info(f"{tag} 🏁 Done — turns={message.num_turns} cost=${message.total_cost_usd}")


def _summarize_input(tool_input: dict) -> str:
    if "command" in tool_input:
        return tool_input["command"][:120]
    if "file_path" in tool_input:
        return tool_input["file_path"]
    return str(tool_input)[:80]


def save_input_pdb_if_provided(job: Job) -> str | None:
    if not job.pdb:
        return None
    os.makedirs(job.output_dir, exist_ok=True)
    path = f"{job.output_dir}/input.pdb"
    with open(path, "w") as f:
        f.write(job.pdb)
    return path
