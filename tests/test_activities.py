import os
import sys
import uuid
from fastapi.testclient import TestClient
import pytest

# Ensure src is importable when tests run from repository root
ROOT = os.path.dirname(os.path.dirname(__file__))
SRC = os.path.join(ROOT, "src")
if SRC not in sys.path:
    sys.path.insert(0, SRC)

import app as app_module

client = TestClient(app_module.app)


def unique_email(prefix="test"):
    return f"{prefix}+{uuid.uuid4().hex[:8]}@example.com"


def test_get_activities():
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    # Basic sanity assertions
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    email = unique_email("signup")

    # Sign up
    # Send email as query param so characters like '+' are encoded correctly
    r = client.post("/activities/Chess Club/signup", params={"email": email})
    assert r.status_code == 200
    assert "Signed up" in r.json().get("message", "")

    # Verify participant appears
    r2 = client.get("/activities")
    assert r2.status_code == 200
    assert email in r2.json()["Chess Club"]["participants"]

    # Unregister
    r3 = client.delete("/activities/Chess Club/participants", params={"email": email})
    assert r3.status_code == 200
    assert "Unregistered" in r3.json().get("message", "")

    # Verify removal
    r4 = client.get("/activities")
    assert email not in r4.json()["Chess Club"]["participants"]


def test_unregister_nonexistent_returns_404():
    # Use a random email unlikely to exist
    email = unique_email("noexist")
    r = client.delete("/activities/Chess Club/participants", params={"email": email})
    assert r.status_code == 404
