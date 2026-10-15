"""
ADMIN-13..15: a small, file-backed model-version registry.

Each trained artifact is recorded with its training dataset reference,
holdout metrics, training timestamp, and an activation flag, plus the
actual fitted pipeline pickled to disk so a rollback (ADMIN-14) restores
the real model, not just its metrics. Exactly one version per model_type
is active at a time (`set_active` deactivates every other entry of the
same model_type before activating the requested one).

This is intentionally a flat JSON file, not a database table -- the ML
microservice has no database of its own (the dataset itself is a CSV file
on disk), so a registry file next to it is the same level of
infrastructure, not a new category of one.
"""

import json
import os
import pickle
import threading

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
ARTIFACTS_DIR = os.path.join(DATA_DIR, "model_artifacts")
REGISTRY_PATH = os.path.join(DATA_DIR, "model_versions.json")

_lock = threading.Lock()

os.makedirs(ARTIFACTS_DIR, exist_ok=True)


def _load_all():
    if not os.path.exists(REGISTRY_PATH):
        return []
    try:
        with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _save_all(entries):
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2)


def save_artifact(version_id, pipeline_obj):
    """Pickles a fitted sklearn pipeline to ARTIFACTS_DIR, returns its path."""
    path = os.path.join(ARTIFACTS_DIR, f"{version_id}.pkl")
    with open(path, "wb") as f:
        pickle.dump(pipeline_obj, f)
    return path


def load_artifact(artifact_path):
    with open(artifact_path, "rb") as f:
        return pickle.load(f)


def add_entry(entry):
    """entry must include at least: id, model_type, trained_at, metrics,
    dataset_reference, artifact_path. active/ever_active default to False."""
    with _lock:
        entries = _load_all()
        entry.setdefault("active", False)
        entry.setdefault("ever_active", False)
        entries.append(entry)
        _save_all(entries)
    return entry


def get_entry(version_id):
    for e in _load_all():
        if e["id"] == version_id:
            return e
    return None


def list_entries(model_type=None):
    entries = _load_all()
    if model_type:
        entries = [e for e in entries if e.get("model_type") == model_type]
    return sorted(entries, key=lambda e: e.get("trained_at", ""), reverse=True)


def set_active(version_id, model_type):
    """Deactivates every other entry of this model_type, activates this one,
    marks it ever_active. Returns the activated entry, or None if not found."""
    with _lock:
        entries = _load_all()
        activated = None
        for e in entries:
            if e.get("model_type") != model_type:
                continue
            if e["id"] == version_id:
                e["active"] = True
                e["ever_active"] = True
                activated = e
            else:
                e["active"] = False
        _save_all(entries)
        return activated


def get_active(model_type):
    for e in _load_all():
        if e.get("model_type") == model_type and e.get("active"):
            return e
    return None
