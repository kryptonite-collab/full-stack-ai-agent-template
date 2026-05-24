import json
from pathlib import Path
from typing import Any

from app.services.llm_qa import LLMQAService
from app.services.metrics import evaluate_qa_result


def load_eval_dataset(dataset_path: str | Path) -> list[dict[str, Any]]:
    """Load evaluation samples from a JSONL dataset file."""
    path = Path(dataset_path)

    samples: list[dict[str, Any]] = []

    with path.open("r", encoding="utf-8") as file:
        for line_number, line in enumerate(file, start=1):
            stripped_line = line.strip()

            if not stripped_line:
                continue

            try:
                sample = json.loads(stripped_line)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    f"Invalid JSONL at line {line_number}: {exc}"
                ) from exc

            samples.append(sample)

    return samples


def run_eval_dataset(
    dataset_path: str | Path = "evals/datasets/rag_qa_sample.jsonl",
    report_path: str | Path = "evals/reports/latest_report.json",
    use_rag: bool = True,
    top_k: int = 3,
) -> dict[str, Any]:
    """Run QA evaluation dataset and write a structured report."""
    samples = load_eval_dataset(dataset_path)
    qa_service = LLMQAService()

    results: list[dict[str, Any]] = []
    badcases: list[dict[str, Any]] = []

    total_latency = 0.0

    for sample in samples:
        qa_result = qa_service.ask(
            question=sample["question"],
            use_rag=use_rag,
            top_k=top_k,
        )

        eval_result = evaluate_qa_result(
            answer=qa_result["answer"],
            contexts=qa_result["contexts"],
            expected_keywords=sample.get("expected_keywords", []),
            expected_source=sample.get("expected_source"),
            latency_ms=qa_result["latency_ms"],
        )

        total_latency += float(qa_result["latency_ms"])

        item_result = {
            "id": sample.get("id"),
            "question": sample["question"],
            "category": sample.get("category"),
            "answer": qa_result["answer"],
            "contexts": qa_result["contexts"],
            "model": qa_result["model"],
            **eval_result,
        }

        results.append(item_result)

        if not eval_result["pass"]:
            badcases.append(
                {
                    "id": sample.get("id"),
                    "question": sample["question"],
                    "category": sample.get("category"),
                    "reason": eval_result["reason"],
                    "missing_keywords": eval_result["missing_keywords"],
                    "expected_source": sample.get("expected_source"),
                }
            )

    total = len(results)
    passed = sum(1 for item in results if item["pass"])
    failed = total - passed
    pass_rate = passed / total if total else 0.0
    avg_latency_ms = total_latency / total if total else 0.0

    report = {
        "total": total,
        "passed": passed,
        "failed": failed,
        "pass_rate": round(pass_rate, 4),
        "avg_latency_ms": round(avg_latency_ms, 2),
        "badcases": badcases,
        "results": results,
    }

    output_path = Path(report_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return report


if __name__ == "__main__":
    report = run_eval_dataset()
    print(json.dumps(report, ensure_ascii=False, indent=2))
