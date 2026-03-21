from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    prompt: str
    user_id: str = "anonymous"
    chat_id: str = "default"
    pdb: str | None = None
    max_iterations: int = 3


class Job(BaseModel):
    job_id: str
    user_id: str
    chat_id: str
    prompt: str
    status: Literal["queued", "running", "completed", "failed"] = "queued"
    current_iteration: int = 0
    max_iterations: int = 3
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    output_dir: str = ""
    pdb: str | None = None
    error: str | None = None
