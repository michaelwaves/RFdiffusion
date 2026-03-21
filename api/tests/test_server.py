from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

from api.jobs import clear_jobs
from api.server import app


@pytest.fixture(autouse=True)
def isolate_jobs():
    clear_jobs()
    yield
    clear_jobs()


@pytest.fixture(autouse=True)
def mock_runner():
    with patch("api.server.run_design_agent", new_callable=AsyncMock):
        yield


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_generate_returns_job(client):
    response = await client.post("/generate", json={"prompt": "make a 4-helix bundle"})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "queued"
    assert "job_id" in body
    assert body["prompt"] == "make a 4-helix bundle"


@pytest.mark.asyncio
async def test_generate_uses_defaults(client):
    response = await client.post("/generate", json={"prompt": "test"})
    body = response.json()
    assert body["user_id"] == "anonymous"
    assert body["chat_id"] == "default"
    assert body["max_iterations"] == 3


@pytest.mark.asyncio
async def test_list_jobs_empty(client):
    response = await client.get("/jobs")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_jobs_after_generate(client):
    await client.post("/generate", json={"prompt": "helix"})
    response = await client.get("/jobs")
    jobs = response.json()
    assert len(jobs) >= 1
    assert jobs[0]["prompt"] == "helix"


@pytest.mark.asyncio
async def test_get_job_by_id(client):
    create = await client.post("/generate", json={"prompt": "beta sheet"})
    job_id = create.json()["job_id"]
    response = await client.get(f"/jobs/{job_id}")
    assert response.status_code == 200
    assert response.json()["job_id"] == job_id


@pytest.mark.asyncio
async def test_get_job_not_found(client):
    response = await client.get("/jobs/nonexistent")
    assert response.status_code == 404
