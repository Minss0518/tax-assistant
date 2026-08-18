from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import settings
from app.routers import admin as admin_module
from app.routers.admin import router as admin_router


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(admin_router)
    with TestClient(app) as test_client:
        yield test_client


def test_missing_token_header_returns_422(client):
    response = client.post("/admin/run-law-pipeline")
    assert response.status_code == 422


def test_wrong_token_returns_403(client, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_PIPELINE_TOKEN", "correct-token")

    response = client.post(
        "/admin/run-law-pipeline", headers={"x-admin-token": "wrong-token"}
    )
    assert response.status_code == 403


def test_no_token_configured_is_always_forbidden(client, monkeypatch):
    # Even if a client happens to send an empty string that would equal an
    # unset "" default, the endpoint must never be reachable when the admin
    # hasn't actually configured a token.
    monkeypatch.setattr(settings, "ADMIN_PIPELINE_TOKEN", "")

    response = client.post("/admin/run-law-pipeline", headers={"x-admin-token": ""})
    assert response.status_code == 403


def test_correct_token_schedules_pipeline_and_returns_immediately(client, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_PIPELINE_TOKEN", "correct-token")
    fake_run = MagicMock(return_value={"law_articles": 1})
    monkeypatch.setattr(admin_module, "_run_law_pipeline_sync", fake_run)

    response = client.post(
        "/admin/run-law-pipeline", headers={"x-admin-token": "correct-token"}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "started"
    fake_run.assert_called_once()
