import json

from app.services.eval_runner import load_eval_dataset, run_eval_dataset


def test_load_eval_dataset(tmp_path):
    dataset_path = tmp_path / "sample.jsonl"
    dataset_path.write_text(
        '{"id":"q001","question":"test one","expected_keywords":["test one"],"expected_source":"mock_policy.md","category":"basic"}\n'
        '{"id":"q002","question":"test two","expected_keywords":["test two"],"expected_source":"mock_policy.md","category":"basic"}\n',
        encoding="utf-8",
    )

    samples = load_eval_dataset(dataset_path)

    assert len(samples) == 2
    assert samples[0]["id"] == "q001"
    assert samples[1]["question"] == "test two"


def test_run_eval_dataset_writes_report(tmp_path):
    dataset_path = tmp_path / "sample.jsonl"
    report_path = tmp_path / "latest_report.json"

    dataset_path.write_text(
        '{"id":"q001","question":"test rag mode","expected_keywords":["test rag mode"],"expected_source":"mock_policy.md","category":"rag_fact"}\n'
        '{"id":"q002","question":"test missing keyword","expected_keywords":["impossible_keyword"],"expected_source":"mock_policy.md","category":"badcase"}\n',
        encoding="utf-8",
    )

    report = run_eval_dataset(
        dataset_path=dataset_path,
        report_path=report_path,
        use_rag=True,
        top_k=3,
    )

    assert report["total"] == 2
    assert report["passed"] == 1
    assert report["failed"] == 1
    assert report["pass_rate"] == 0.5
    assert len(report["badcases"]) == 1
    assert report["badcases"][0]["id"] == "q002"

    assert report_path.exists()

    saved_report = json.loads(report_path.read_text(encoding="utf-8"))
    assert saved_report["total"] == 2
    assert saved_report["failed"] == 1
