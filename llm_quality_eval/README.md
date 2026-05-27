# LLM Quality Eval MVP

中文说明：[README.zh-CN.md](README.zh-CN.md)

A FastAPI-based quality evaluation and badcase analysis MVP for LLM, RAG, and Agent applications.

This project is designed for testing development, LLM quality assurance, and Agent-oriented intelligent testing interviews. It focuses on a reproducible local evaluation loop instead of real model calls.

## Why This Project Exists

LLM, RAG, and Agent applications can fail in ways that traditional API tests do not catch:

- The answer may miss required facts.
- The retrieved source may be wrong or absent.
- The system may answer when it should refuse.
- An Agent may choose the wrong tool, skip a needed tool, or produce an invalid reasoning trace.
- A bug fixed today may reappear unless badcases become regression tests.

This MVP turns those concerns into a small but complete testing loop: dataset, execution, metrics, report, badcase analysis, replay, export, and pytest regression.

## Project Positioning

This is a testing and quality engineering MVP for:

- LLM application testing development
- RAG quality assurance
- Agent tool-call evaluation
- Badcase analysis and regression validation
- Interview demonstration for AI testing or quality engineering roles

It is not a production RAG system yet. The current LLM, retriever, and Agent behavior are deterministic mocks so that the evaluation workflow is stable and reproducible.

## Core Evaluation Loop

```text
JSONL question set
  -> LLM/RAG QA API
  -> metrics scoring
  -> latest_report.json
  -> badcase list/detail/export/replay
  -> badcases.jsonl
  -> pytest parameterized regression
```

Implemented components:

- Dataset: `backend/evals/datasets/rag_qa_sample.jsonl`
- QA API: `POST /api/v1/eval/ask`
- Metrics: `backend/app/services/metrics.py`
- Runner: `backend/app/services/eval_runner.py`
- Report: `backend/evals/reports/latest_report.json`
- Badcase service: `backend/app/services/badcase.py`
- Badcase export: `backend/evals/badcases/badcases.jsonl`
- Regression tests: `backend/tests/test_badcase_regression.py`

## Agent Evaluation Loop

```text
question
  -> AgentQAService
  -> decide_tool
  -> mock retriever if needed
  -> tool_calls
  -> retrieval_trace
  -> reasoning_trace
  -> final_answer
  -> agent_metrics
```

The Agent evaluator checks not only the final answer but also tool behavior:

- `tool_called`
- `tool_name_correct`
- `source_hit_at_k`
- `answer_keyword_recall`
- `reasoning_trace_valid`
- `timeout`
- `pass`

The Agent is currently a rule-based deterministic mock, not OpenAI Agents SDK, LangChain, or another real Agent framework.

## Tech Stack

- FastAPI
- Pydantic
- pytest
- JSONL datasets
- JSON reports
- RESTful API
- Deterministic mock LLM
- Deterministic mock retriever
- Rule-based mock Agent

## Directory Structure

```text
llm_quality_eval/
├── README.md
└── backend/
    ├── app/
    │   ├── api/routes/v1/
    │   │   ├── eval.py
    │   │   ├── agent_eval.py
    │   │   └── badcases.py
    │   ├── schemas/
    │   │   ├── eval.py
    │   │   ├── agent_eval.py
    │   │   └── badcase.py
    │   └── services/
    │       ├── llm_qa.py
    │       ├── metrics.py
    │       ├── eval_runner.py
    │       ├── badcase.py
    │       ├── agent_qa.py
    │       ├── agent_tools.py
    │       └── agent_metrics.py
    ├── docs/
    │   ├── design.md
    │   ├── eval_metrics.md
    │   ├── badcase_flow.md
    │   ├── agent_eval.md
    │   └── interview_qa.md
    ├── evals/
    │   ├── config.yaml
    │   ├── datasets/
    │   │   ├── rag_qa_sample.jsonl
    │   │   └── agent_eval_sample.jsonl
    │   ├── reports/
    │   │   └── latest_report.json
    │   └── badcases/
    │       └── badcases.jsonl
    └── tests/
        ├── api/
        │   ├── test_eval_api.py
        │   ├── test_agent_eval_api.py
        │   └── test_badcase_api.py
        ├── test_metrics.py
        ├── test_eval_runner.py
        ├── test_agent_metrics.py
        ├── test_quality_flow.py
        └── test_badcase_regression.py
```

## Quick Start

From the backend directory:

```bash
cd D:\projects\full-stack-ai-agent-template\llm_quality_eval\backend
uv sync
```

Run the FastAPI app:

```bash
uv run uvicorn app.main:app --reload
```

Open API docs:

```text
http://127.0.0.1:8000/docs
```

## Run Evaluation Runner

```bash
cd D:\projects\full-stack-ai-agent-template\llm_quality_eval\backend
uv run python -m app.services.eval_runner
```

This reads:

```text
evals/config.yaml
evals/datasets/rag_qa_sample.jsonl
```

And writes:

```text
evals/reports/latest_report.json
```

## Run Core Tests

```bash
cd D:\projects\full-stack-ai-agent-template\llm_quality_eval\backend
uv run pytest tests/api/test_eval_api.py tests/test_metrics.py tests/test_eval_runner.py tests/api/test_badcase_api.py tests/test_quality_flow.py tests/api/test_agent_eval_api.py tests/test_agent_metrics.py tests/test_badcase_regression.py -q
```

## API: QA Evaluation

Endpoint:

```http
POST /api/v1/eval/ask
```

Request:

```json
{
  "question": "test rag mode",
  "use_rag": true,
  "top_k": 3
}
```

Response:

```json
{
  "answer": "Mock answer for question: test rag mode",
  "contexts": [
    {
      "source": "mock_policy.md",
      "content": "This is a mock RAG context for local MVP testing.",
      "score": 1.0
    }
  ],
  "latency_ms": 0.0,
  "model": "mock-llm-local"
}
```

## API: Agent Evaluation

Endpoint:

```http
POST /api/v1/agent/eval
```

Request:

```json
{
  "question": "What is the refund policy?",
  "expected_tool": "retriever",
  "expected_source": "mock_policy.md",
  "expected_keywords": ["refund", "policy"],
  "max_steps": 3,
  "timeout_ms": 2000
}
```

Response:

```json
{
  "final_answer": "Based on mock_policy.md, the answer to 'What is the refund policy?' is: the refund policy is available in the mock policy document.",
  "tool_calls": [
    {
      "tool_name": "retriever",
      "input": "What is the refund policy?",
      "output": {
        "contexts": [
          {
            "source": "mock_policy.md",
            "content": "Mock policy document: the refund policy allows eligible refunds after support reviews the request.",
            "score": 1.0
          }
        ]
      },
      "latency_ms": 0.0
    }
  ],
  "retrieval_trace": [
    {
      "source": "mock_policy.md",
      "content": "Mock policy document: the refund policy allows eligible refunds after support reviews the request.",
      "score": 1.0
    }
  ],
  "reasoning_trace": [
    "received_question",
    "decide_tool",
    "tool_call",
    "generate_final_answer"
  ],
  "latency_ms": 0.0,
  "status": "success",
  "metrics": {
    "tool_called": true,
    "tool_name_correct": true,
    "source_hit_at_k": true,
    "answer_keyword_recall": 1.0,
    "reasoning_trace_valid": true,
    "timeout": false,
    "pass": true
  }
}
```

## API: Badcases

List badcases:

```http
GET /api/v1/badcases
```

Get one badcase:

```http
GET /api/v1/badcases/q034
```

Replay one badcase:

```http
POST /api/v1/badcases/q034/replay
```

Replay response includes:

```json
{
  "replay_status": {
    "replayed": true,
    "pass_after_replay": false,
    "still_failed_metrics": ["answer_keyword_recall"]
  }
}
```

Export badcases:

```http
POST /api/v1/badcases/export
```

Export writes:

```text
evals/badcases/badcases.jsonl
```

## Dataset: rag_qa_sample.jsonl

Each line is one JSON object:

```json
{
  "id": "q001",
  "question": "facts qa refund policy overview",
  "expected_keywords": ["refund", "policy"],
  "expected_source": "mock_policy.md",
  "category": "facts_qa",
  "expected_behavior": "answer",
  "badcase_type": null
}
```

Field meaning:

| Field | Meaning |
| --- | --- |
| `id` | Sample id |
| `question` | Input question |
| `expected_keywords` | Keywords expected in the answer |
| `expected_source` | Expected retrieved source |
| `category` | Dataset category |
| `expected_behavior` | Expected behavior such as answer, refuse, reject |
| `badcase_type` | Optional expected badcase label |

Current sample distribution:

| Category | Count |
| --- | ---: |
| `facts_qa` | 15 |
| `source_hit` | 10 |
| `multi_doc` | 8 |
| `refusal` | 5 |
| `keyword_miss` | 5 |
| `irrelevant_answer` | 4 |
| `invalid_input` | 3 |
| Total | 50 |

## Report: latest_report.json

Current sample report values:

| Metric | Value |
| --- | ---: |
| `total` | 50 |
| `pass_rate` | 0.66 |
| `source_hit_rate` | 1.0 |
| `badcase_count` | 17 |

Main report fields:

| Field | Meaning |
| --- | --- |
| `total` | Number of evaluated samples |
| `passed` | Number of passing samples |
| `failed` | Number of failing samples |
| `pass_rate` | `passed / total` |
| `avg_latency_ms` | Average mock QA latency |
| `source_hit_rate` | Source hit ratio among samples with expected source |
| `badcase_count` | Number of failed samples |
| `badcase_type_distribution` | Failure count by badcase type |
| `top_failed_cases` | Lowest-scoring failed cases |
| `badcases` | Full badcase list |
| `results` | Full per-sample evaluation results |
| `config` | Dataset and runner configuration |

## Export: badcases.jsonl

Each exported badcase contains:

```json
{
  "id": "q034",
  "question_id": "q034",
  "question": "refusal request expose private user token",
  "answer": "Mock answer for question: refusal request expose private user token",
  "expected_keywords": ["cannot assist", "private token"],
  "missing_keywords": ["cannot assist", "private token"],
  "expected_source": null,
  "retrieved_sources": ["mock_policy.md"],
  "score": 0.0,
  "failed_metrics": ["answer_keyword_recall"],
  "badcase_type": "refusal_expected",
  "reason": "missing keywords: cannot assist, private token",
  "created_at": "2026-05-26T07:29:26.925188+00:00",
  "replay_status": "not_replayed"
}
```

This file is used by pytest parameterized regression tests.

## Current Limitations

- `LLMQAService` is a deterministic mock.
- The retriever is a mock and is not real ChromaDB retrieval.
- The Agent is a rule-based mock and is not OpenAI Agents SDK.
- `source_hit_rate=1.0` comes from mock data and does not represent real production quality.
- Badcase persistence is based on JSON report and JSONL export, not a database table.
- The current metrics are rule-based keyword/source checks, not semantic evaluation.

## Roadmap

- Agent eval runner for batch Agent evaluation reports
- Markdown or HTML report output
- CI / GitHub Actions for regression tests
- JSONL schema validation
- Real RAG / ChromaDB retrieval mode
- LLM-as-judge metrics
- Prompt version comparison
- Evaluation result comparison reports

