from unittest.mock import AsyncMock, patch

import pytest

from api.jobs import clear_jobs, get_job, save_job
from api.models import Job
from api.runner import run_design_agent


def make_test_job(**overrides) -> Job:
    defaults = dict(
        job_id="test123",
        user_id="anonymous",
        chat_id="default",
        prompt="make a helix",
        output_dir="/tmp/test_outputs/anonymous/default/test123",
    )
    return Job(**(defaults | overrides))


@pytest.fixture(autouse=True)
def isolate():
    clear_jobs()
    yield
    clear_jobs()


@pytest.mark.asyncio
async def test_runner_updates_job_status_to_running():
    job = make_test_job()
    save_job(job)

    with patch("api.runner.invoke_claude_agent", new_callable=AsyncMock):
        await run_design_agent(job)

    updated = get_job(job.job_id)
    assert updated.status in ("completed", "failed")


@pytest.mark.asyncio
async def test_runner_marks_completed_on_success():
    job = make_test_job()
    save_job(job)

    with patch("api.runner.invoke_claude_agent", new_callable=AsyncMock) as mock:
        mock.return_value = None
        await run_design_agent(job)

    assert get_job(job.job_id).status == "completed"


@pytest.mark.asyncio
async def test_runner_marks_failed_on_error():
    job = make_test_job()
    save_job(job)

    with patch("api.runner.invoke_claude_agent", new_callable=AsyncMock) as mock:
        mock.side_effect = RuntimeError("GPU exploded")
        await run_design_agent(job)

    updated = get_job(job.job_id)
    assert updated.status == "failed"
    assert "GPU exploded" in updated.error
