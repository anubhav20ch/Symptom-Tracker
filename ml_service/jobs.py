"""
ADMIN-12: minimal in-memory async job tracker for model retraining.

The triggering request (POST /retrain) returns immediately with a job id;
the actual training runs on a background thread. Progress/status is then
pollable via GET /retrain/{job_id}. In-memory is sufficient here -- this is
a single-process microservice with no job queue infrastructure elsewhere,
and a job's whole lifecycle (seconds) is shorter than a process restart is
likely to happen; a job lost to a restart is re-triggerable the same way
the old synchronous endpoint always was.
"""

import threading
import uuid
from datetime import datetime, timezone

_jobs = {}
_lock = threading.Lock()


def create_job(job_type):
    job_id = uuid.uuid4().hex
    with _lock:
        _jobs[job_id] = {
            "job_id": job_id,
            "job_type": job_type,
            "status": "queued",
            "progress": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "result": None,
            "error": None,
        }
    return job_id


def update_job(job_id, **fields):
    with _lock:
        if job_id in _jobs:
            _jobs[job_id].update(fields)


def get_job(job_id):
    with _lock:
        return dict(_jobs[job_id]) if job_id in _jobs else None


def run_in_background(target, *args, **kwargs):
    thread = threading.Thread(target=target, args=args, kwargs=kwargs, daemon=True)
    thread.start()
    return thread
