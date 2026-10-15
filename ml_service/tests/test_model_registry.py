import pytest
import model_registry
import jobs

def test_jobs_tracker():
    job_id = jobs.create_job("retrain")
    job = jobs.get_job(job_id)
    assert job["status"] == "queued"
    assert job["job_type"] == "retrain"

    jobs.update_job(job_id, status="running", progress=50)
    job = jobs.get_job(job_id)
    assert job["status"] == "running"
    assert job["progress"] == 50

def test_model_registry_lifecycle(tmp_path, monkeypatch):
    test_json = tmp_path / "model_versions.json"
    monkeypatch.setattr(model_registry, "REGISTRY_PATH", str(test_json))

    entry1 = model_registry.add_entry({
        "id": "v1.0",
        "model_type": "disease_predictor",
        "trained_at": "2026-10-10T00:00:00Z",
        "metrics": {"accuracy": 0.95},
        "dataset_reference": "default",
        "artifact_path": "/fake/path/v1.pkl"
    })
    assert entry1["active"] is False

    # Activate v1
    act = model_registry.set_active("v1.0", "disease_predictor")
    assert act["active"] is True
    assert act["ever_active"] is True

    # Add v2
    entry2 = model_registry.add_entry({
        "id": "v2.0",
        "model_type": "disease_predictor",
        "trained_at": "2026-10-12T00:00:00Z",
        "metrics": {"accuracy": 0.97},
        "dataset_reference": "dataset_v2",
        "artifact_path": "/fake/path/v2.pkl"
    })
    # Activate v2, v1 should become inactive
    act2 = model_registry.set_active("v2.0", "disease_predictor")
    assert act2["active"] is True
    assert model_registry.get_entry("v1.0")["active"] is False

    # Roll back to v1
    rollback = model_registry.set_active("v1.0", "disease_predictor")
    assert rollback["active"] is True
    assert model_registry.get_entry("v2.0")["active"] is False
