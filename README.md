# LLM Quality Eval MVP

[中文说明](llm_quality_eval/README.zh-CN.md) | [English README](llm_quality_eval/README.md)

本仓库核心项目位于：`llm_quality_eval/`

这是一个面向 LLM / RAG / Agent 应用的大模型质量评测与 Badcase 分析平台 MVP，面向测试开发、大模型质量保障和 Agent 智能化测试开发实习面试展示。

## 核心能力

- 基于 FastAPI 提供 QA/RAG 问答评测接口：`POST /api/v1/eval/ask`
- 构建 50 条多类别 JSONL 评测集
- 基于 metrics 自动计算 `answer_keyword_recall`、`source_hit_rate`、`pass_rate`、`badcase_count`
- 通过 `eval_runner` 生成 `latest_report.json`
- 支持 Badcase 查询、详情、Replay、JSONL export
- 使用 pytest 参数化读取 `badcases.jsonl` 进行回归验证
- 新增 Agent 工具调用评测接口：`POST /api/v1/agent/eval`
- 记录 `tool_calls`、`retrieval_trace`、`reasoning_trace`，并评估工具调用和最终回答质量

## 当前说明

当前项目是面向实习面试展示的质量评测 MVP，重点是评测闭环、Badcase 回归和 Agent 过程评测。

当前 LLM / RAG / Agent 都是 deterministic mock：

- 不真实调用 OpenAI
- 不是真实 ChromaDB 检索
- 不是生产级 Agent 框架
- 主要用于稳定复现评测流程、报告生成和回归测试闭环

## 快速进入项目

核心项目路径：

`llm_quality_eval/backend`

启动后端：

`uv run uvicorn app.main:app --reload`

访问接口文档：

`http://127.0.0.1:8000/docs`

核心测试命令：

`uv run pytest tests/api/test_eval_api.py tests/test_metrics.py tests/test_eval_runner.py tests/api/test_badcase_api.py tests/test_quality_flow.py tests/api/test_agent_eval_api.py tests/test_agent_metrics.py tests/test_badcase_regression.py -q`

## 项目文档

- [中文说明](llm_quality_eval/README.zh-CN.md)
- [English README](llm_quality_eval/README.md)
- [系统设计](llm_quality_eval/backend/docs/design.md)
- [评测指标](llm_quality_eval/backend/docs/eval_metrics.md)
- [Badcase 闭环](llm_quality_eval/backend/docs/badcase_flow.md)
- [Agent 评测](llm_quality_eval/backend/docs/agent_eval.md)
- [面试问答](llm_quality_eval/backend/docs/interview_qa.md)

## 来源说明

本项目基于 full-stack-ai-agent-template 裁剪和改造，当前重点是 LLM/RAG/Agent 质量评测、Badcase 分析和 pytest 回归验证。
