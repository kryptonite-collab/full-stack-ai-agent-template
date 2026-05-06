{%- if cookiecutter.enable_billing and cookiecutter.enable_credits_system and cookiecutter.use_postgresql and (cookiecutter.use_celery or cookiecutter.use_taskiq or cookiecutter.use_arq) %}
"""Cleanup tasks — periodic purge of old usage events."""

import asyncio
import logging
from typing import Any

{%- if cookiecutter.use_celery %}
from celery import shared_task
{%- elif cookiecutter.use_taskiq %}
from app.worker.taskiq_app import broker
{%- endif %}

from app.db.session import get_worker_db_context
from app.services.usage import UsageService

logger = logging.getLogger(__name__)

USAGE_RETENTION_DAYS = 90


async def _cleanup_usage_events() -> int:
    async with get_worker_db_context() as db:
        return await UsageService(db).cleanup_old_events(retention_days=USAGE_RETENTION_DAYS)

{%- if cookiecutter.use_celery %}


@shared_task(bind=True, max_retries=1, ignore_result=True)
def cleanup_usage_events_task(self: Any) -> None:
    """Cron: purge usage events older than 90 days and refresh the daily matview."""
    try:
        count = asyncio.run(_cleanup_usage_events())
        logger.info("cleanup_usage_events_done", extra={"deleted": count})
    except Exception as exc:
        logger.exception("cleanup_usage_events_task_failed")
        raise self.retry(exc=exc, countdown=600) from exc

{%- elif cookiecutter.use_taskiq %}


@broker.task
async def cleanup_usage_events_task() -> dict[str, int]:
    """Cron: purge usage events older than 90 days and refresh the daily matview."""
    count = await _cleanup_usage_events()
    logger.info("cleanup_usage_events_done", extra={"deleted": count})
    return {"deleted": count}

{%- elif cookiecutter.use_arq %}


async def cleanup_usage_events_task(ctx: dict[str, Any]) -> dict[str, int]:
    """Cron: purge usage events older than 90 days and refresh the daily matview."""
    count = await _cleanup_usage_events()
    logger.info("cleanup_usage_events_done", extra={"deleted": count})
    return {"deleted": count}
{%- endif %}
{%- endif %}
