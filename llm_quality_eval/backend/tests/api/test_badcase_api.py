import json

from fastapi.testclient import TestClient

from app.main import app
from app.services import badcase as badcase_service_module


client = TestClient(app)


def _write_report(report_path):
    report = {
        "total": 2,
        "passed": 1,
        "failed": 1,
        "pass_rate": 0.5,
        "avg_latency_ms": 0.0,
        "badcases": [
            {
                "id": "q002",
                "question": "test missing keyword",
                "category": "badcase",
                "reason": "missing keywords: impossible_keyword",
                "missing_keywords": ["impossible_keyword"],
                "expected_source": "mock_policy.md",
            }
        ],
        "results": [],
    }

    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def test_list_badcases(monkeypatch, tmp_path):
    report_path = tmp_path / "latest_report.json"
    _write_report(report_path)

    monkeypatch.setattr(
        badcase_service_module,
        "DEFAULT_REPORT_PATH",
        report_path,
    )

    response = client.get("/api/v1/badcases")

    assert response.status_code == 200

    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["id"] == "q002"
    assert data["items"][0]["question"] == "test missing keyword"


def test_get_badcase(monkeypatch, tmp_path):
    report_path = tmp_path / "latest_report.json"
    _write_report(report_path)

    monkeypatch.setattr(
        badcase_service_module,
        "DEFAULT_REPORT_PATH",
        report_path,
    )

    response = client.get("/api/v1/badcases/q002")

    assert response.status_code == 200

    data = response.json()
    assert data["id"] == "q002"
    assert data["reason"] == "missing keywords: impossible_keyword"
    assert data["missing_keywords"] == ["impossible_keyword"]


def test_get_badcase_not_found(monkeypatch, tmp_path):
    report_path = tmp_path / "latest_report.json"
    _write_report(report_path)

    monkeypatch.setattr(
        badcase_service_module,
        "DEFAULT_REPORT_PATH",
        report_path,
    )

    response = client.get("/api/v1/badcases/not-exist")

    assert response.status_code == 404


def test_replay_badcase(monkeypatch, tmp_path):
    report_path = tmp_path / "latest_report.json"
    _write_report(report_path)

    monkeypatch.setattr(
        badcase_service_module,
        "DEFAULT_REPORT_PATH",
        report_path,
    )

    response = client.post("/api/v1/badcases/q002/replay")

    assert response.status_code == 200

    data = response.json()
    assert data["id"] == "q002"
    assert data["question"] == "test missing keyword"
    assert data["answer"] == "Mock answer for question: test missing keyword"
    assert data["model"] == "mock-llm-local"
    assert data["original_badcase"]["id"] == "q002"
