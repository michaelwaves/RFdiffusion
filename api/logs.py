import json
import os

_job_logs: dict[str, list[str]] = {}

LOGS_DIR = "/workspace/RFdiffusion/outputs/logs"


def append_log(job_id: str, message: str) -> None:
    if job_id not in _job_logs:
        _job_logs[job_id] = []
    _job_logs[job_id].append(message)
    save_logs_to_disk(job_id)


def get_logs(job_id: str) -> list[str]:
    if job_id in _job_logs:
        return _job_logs[job_id]
    return load_logs_from_disk(job_id)


def save_logs_to_disk(job_id: str) -> None:
    os.makedirs(LOGS_DIR, exist_ok=True)
    path = os.path.join(LOGS_DIR, f"{job_id}.json")
    with open(path, "w") as f:
        json.dump(_job_logs.get(job_id, []), f)


def load_logs_from_disk(job_id: str) -> list[str]:
    path = os.path.join(LOGS_DIR, f"{job_id}.json")
    if not os.path.isfile(path):
        return []
    with open(path) as f:
        return json.load(f)


def clear_logs(job_id: str | None = None) -> None:
    if job_id:
        _job_logs.pop(job_id, None)
    else:
        _job_logs.clear()
