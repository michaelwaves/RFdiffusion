from api.models import Job


_jobs: dict[str, Job] = {}


def save_job(job: Job) -> None:
    _jobs[job.job_id] = job


def get_job(job_id: str) -> Job | None:
    return _jobs.get(job_id)


def list_jobs(user_id: str | None = None) -> list[Job]:
    jobs = list(_jobs.values())
    if user_id:
        jobs = [j for j in jobs if j.user_id == user_id]
    return sorted(jobs, key=lambda j: j.created_at, reverse=True)


def clear_jobs() -> None:
    _jobs.clear()
