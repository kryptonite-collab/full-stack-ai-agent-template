import json
from pathlib import Path
from typing import Any

from app.services.llm_qa import LLMQAService

DEFAULT_REPORT_PATH = Path("evals/reports/latest_report.json")


class BadcaseService:
    def __init__(self, report_path: str | Path | None = None) -> None:
        self.report_path = Path(report_path) if report_path else DEFAULT_REPORT_PATH

    def _load_report(self) -> dict[str, Any]:
        if not self.report_path.exists():
            return {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "pass_rate": 0.0,
                "badcases": [],
                "results": [],
            }

        return json.loads(self.report_path.read_text(encoding="utf-8"))

    def list_badcases(self) -> list[dict[str, Any]]:
        report = self._load_report()
        return list(report.get("badcases", []))

    def get_badcase(self, badcase_id: str) -> dict[str, Any] | None:
        for badcase in self.list_badcases():
            if str(badcase.get("id")) == str(badcase_id):
                return badcase

        return None

    def replay_badcase(
        self,
        badcase_id: str,
        use_rag: bool = True,
        top_k: int = 3,
    ) -> dict[str, Any] | None:
        badcase = self.get_badcase(badcase_id)

        if badcase is None:
            return None

        qa_service = LLMQAService()
        qa_result = qa_service.ask(
            question=badcase["question"],
            use_rag=use_rag,
            top_k=top_k,
        )

        return {
            "id": badcase.get("id"),
            "question": badcase["question"],
            "answer": qa_result["answer"],
            "contexts": qa_result["contexts"],
            "latency_ms": qa_result["latency_ms"],
            "model": qa_result["model"],
            "original_badcase": badcase,
        }
