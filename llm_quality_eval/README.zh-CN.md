# LLM Quality Eval MVP

English README: [README.md](README.md)

这是一个面向 LLM / RAG / Agent 应用的大模型质量评测与 Badcase 分析平台 MVP。

项目定位不是“做一个真实线上大模型系统”，而是从测试开发和大模型质量保障视角，搭建一条可复现的评测闭环：评测数据、接口调用、自动评分、报告生成、Badcase 分析、Replay 复测、JSONL 导出和 pytest 回归验证。

## 项目背景

LLM、RAG 和 Agent 应用的失败方式，和传统后端接口不完全一样：

- 回答可能缺少关键事实。
- RAG 可能检索到了错误来源，或者没有命中预期来源。
- 系统应该拒答时却给出了回答。
- Agent 可能选错工具、跳过必要工具，或者 reasoning trace 不符合预期。
- 今天修复的 Badcase，如果没有沉淀成回归测试，后续很容易再次出现。

这个 MVP 的目标，就是把这些质量问题转化成可执行、可统计、可回归的测试资产。

## 项目定位

适合用于展示以下方向的能力：

- 测试开发
- 大模型质量保障
- RAG 评测
- Agent 工具调用评测
- Badcase 分析与回归验证
- pytest 自动化测试
- FastAPI 服务端接口开发

当前实现优先保证评测链路稳定、可复现、无外部依赖。因此 LLM、RAG 和 Agent 都是 deterministic mock。

## 核心评测闭环

```text
JSONL 问题集
  -> LLM/RAG 问答接口
  -> metrics 自动评分
  -> latest_report.json
  -> Badcase 查询 / 导出 / Replay
  -> badcases.jsonl
  -> pytest 参数化回归测试
```

对应代码和数据：

- 评测集：`backend/evals/datasets/rag_qa_sample.jsonl`
- 问答接口：`POST /api/v1/eval/ask`
- 评分逻辑：`backend/app/services/metrics.py`
- 批量评测：`backend/app/services/eval_runner.py`
- 评测报告：`backend/evals/reports/latest_report.json`
- Badcase 服务：`backend/app/services/badcase.py`
- Badcase 导出：`backend/evals/badcases/badcases.jsonl`
- 回归测试：`backend/tests/test_badcase_regression.py`

## Agent 评测闭环

```text
question
  -> AgentQAService
  -> decide_tool
  -> mock retriever
  -> tool_calls
  -> retrieval_trace
  -> reasoning_trace
  -> final_answer
  -> agent_metrics
```

Agent 评测关注的不只是最终回答，还包括过程是否正确：

- 是否调用了工具：`tool_called`
- 工具名是否正确：`tool_name_correct`
- source 是否命中：`source_hit_at_k`
- 答案关键词召回：`answer_keyword_recall`
- reasoning trace 是否有效：`reasoning_trace_valid`
- 是否超时：`timeout`
- 综合是否通过：`pass`

当前 Agent 是 rule-based deterministic mock，不是 OpenAI Agents SDK、LangChain 或 LangGraph。

## 技术栈

- FastAPI
- Pydantic
- pytest
- JSONL
- JSON report
- RESTful API
- deterministic mock LLM
- mock retriever
- rule-based mock Agent

## 项目目录结构

```text
llm_quality_eval/
├── README.md
├── README.zh-CN.md
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

## 快速启动

进入 backend 目录：

```bash
cd D:\projects\full-stack-ai-agent-template\llm_quality_eval\backend
uv sync
```

启动 FastAPI：

```bash
uv run uvicorn app.main:app --reload
```

访问接口文档：

```text
http://127.0.0.1:8000/docs
```

## 运行批量评测

```bash
cd D:\projects\full-stack-ai-agent-template\llm_quality_eval\backend
uv run python -m app.services.eval_runner
```

输入：

```text
evals/config.yaml
evals/datasets/rag_qa_sample.jsonl
```

输出：

```text
evals/reports/latest_report.json
```

## 运行核心测试

```bash
cd D:\projects\full-stack-ai-agent-template\llm_quality_eval\backend
uv run pytest tests/api/test_eval_api.py tests/test_metrics.py tests/test_eval_runner.py tests/api/test_badcase_api.py tests/test_quality_flow.py tests/api/test_agent_eval_api.py tests/test_agent_metrics.py tests/test_badcase_regression.py -q
```

## API 示例：问答评测

接口：

```http
POST /api/v1/eval/ask
```

请求：

```json
{
  "question": "test rag mode",
  "use_rag": true,
  "top_k": 3
}
```

响应：

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

## API 示例：Agent 工具调用评测

接口：

```http
POST /api/v1/agent/eval
```

请求：

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

响应节选：

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

## API 示例：Badcase

查询列表：

```http
GET /api/v1/badcases
```

查询详情：

```http
GET /api/v1/badcases/q034
```

Replay 复测：

```http
POST /api/v1/badcases/q034/replay
```

Replay 响应包含：

```json
{
  "replay_status": {
    "replayed": true,
    "pass_after_replay": false,
    "still_failed_metrics": ["answer_keyword_recall"]
  }
}
```

导出 Badcase：

```http
POST /api/v1/badcases/export
```

输出文件：

```text
evals/badcases/badcases.jsonl
```

## 评测数据：rag_qa_sample.jsonl

每一行是一个 JSON 样本：

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

字段说明：

| 字段 | 含义 |
| --- | --- |
| `id` | 样本 ID |
| `question` | 输入问题 |
| `expected_keywords` | 期望答案包含的关键词 |
| `expected_source` | 期望命中的来源 |
| `category` | 样本类别 |
| `expected_behavior` | 期望行为，例如 answer、refuse、reject |
| `badcase_type` | 预设 Badcase 类型，可为空 |

当前样本分布：

| 类别 | 数量 |
| --- | ---: |
| `facts_qa` | 15 |
| `source_hit` | 10 |
| `multi_doc` | 8 |
| `refusal` | 5 |
| `keyword_miss` | 5 |
| `irrelevant_answer` | 4 |
| `invalid_input` | 3 |
| 总计 | 50 |

## 评测报告：latest_report.json

当前样例报告真实结果：

| 指标 | 数值 |
| --- | ---: |
| `total` | 50 |
| `pass_rate` | 0.66 |
| `source_hit_rate` | 1.0 |
| `badcase_count` | 17 |

主要字段：

| 字段 | 含义 |
| --- | --- |
| `total` | 评测样本总数 |
| `passed` | 通过样本数 |
| `failed` | 失败样本数 |
| `pass_rate` | 通过率 |
| `avg_latency_ms` | 平均 mock 延迟 |
| `source_hit_rate` | source 命中率 |
| `badcase_count` | Badcase 数量 |
| `badcase_type_distribution` | Badcase 类型分布 |
| `top_failed_cases` | 低分失败样本 |
| `badcases` | 完整 Badcase 列表 |
| `results` | 每条样本的评测结果 |
| `config` | 评测配置 |

## Badcase 导出：badcases.jsonl

每行一个 Badcase：

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

这个文件可以作为 pytest 参数化回归测试的数据来源。

## 当前限制

- `LLMQAService` 是 deterministic mock。
- retriever 是 mock，不是真实 ChromaDB 检索。
- Agent 是 rule-based mock，不是真实 OpenAI Agents SDK。
- `source_hit_rate=1.0` 来自 mock 数据，不代表真实生产系统质量。
- Badcase 持久化当前基于 JSON report 和 JSONL，不是数据库。
- 当前指标是规则型关键词和来源检查，不是语义评测。

## 后续规划

- Agent eval runner：把 Agent 单次评测接入批量报告。
- Markdown / HTML 报告：提升可读性和展示效果。
- CI / GitHub Actions：让核心回归自动运行。
- JSONL schema 校验：提升数据质量。
- 真实 RAG / ChromaDB：增加真实检索模式。
- LLM-as-judge：补充语义质量评估。
- Prompt 版本对比：支持不同 prompt 的质量对比。
- 评测结果 diff：对比多次评测结果变化。

