"""CLI interface for Full-Stack AI Agent Template Generator."""

from pathlib import Path

import click
from rich.console import Console

from . import __version__
from .config import (
    AIFrameworkType,
    BackgroundTaskType,
    BrandColorType,
    CIType,
    DatabaseType,
    EmailProviderType,
    FrontendType,
    LLMProviderType,
    OAuthProvider,
    OrmType,
    PdfParserType,
    ProjectConfig,
    RAGFeatures,
    RerankerType,
    VectorStoreType,
)
from .generator import generate_project, post_generation_tasks
from .prompts import confirm_generation, run_interactive_prompts, show_summary

console = Console()


@click.group(invoke_without_command=True)
@click.version_option(version=__version__, prog_name="fastapi-fullstack")
@click.pass_context
def cli(ctx: click.Context) -> None:
    """Full-Stack AI Agent Template Generator.

    Generate production-ready FastAPI + Next.js projects with AI agents,
    WebSocket streaming, 20+ enterprise integrations, and observability.
    """
    if ctx.invoked_subcommand is None:
        ctx.invoke(new)


@cli.command()
@click.option(
    "-o",
    "--output",
    type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path),
    default=None,
    help="Output directory for the generated project",
)
@click.option(
    "--no-input",
    is_flag=True,
    default=False,
    help="Use default values without prompts",
)
@click.option("--name", type=str, help="Project name (for --no-input mode)")
@click.option(
    "--minimal",
    is_flag=True,
    default=False,
    help="Skip wizard — ask only for project name and use minimal defaults (SQLite, no Docker/Redis/CI)",
)
def new(output: Path | None, no_input: bool, name: str | None, minimal: bool) -> None:
    """Create a new FastAPI project interactively."""
    try:
        if no_input or minimal:
            if not name:
                if minimal:
                    import questionary

                    name = questionary.text(
                        "Project name:",
                        validate=lambda v: bool(v) or "Name cannot be empty",
                    ).ask()
                    if not name:
                        console.print("\n[yellow]Cancelled.[/]")
                        return
                else:
                    console.print("[red]Error:[/] --name is required when using --no-input")
                    raise SystemExit(1)

            if minimal:
                config = ProjectConfig(
                    project_name=name,
                    database=DatabaseType.SQLITE,
                    enable_logfire=False,
                    enable_redis=False,
                    enable_caching=False,
                    enable_rate_limiting=False,
                    enable_pagination=False,
                    enable_admin_panel=False,
                    enable_docker=False,
                    enable_kubernetes=False,
                    background_tasks=BackgroundTaskType.NONE,
                    ci_type=CIType.NONE,
                )
                console.print(f"[cyan]Creating minimal project:[/] {name}")
                console.print("[dim]SQLite · no Docker · no Redis · no CI[/]")
                console.print()
            else:
                config = ProjectConfig(project_name=name, background_tasks=BackgroundTaskType.NONE)
        else:
            config = run_interactive_prompts()
            show_summary(config)

            if not confirm_generation():
                console.print("[yellow]Project generation cancelled.[/]")
                return

        project_path = generate_project(config, output)
        post_generation_tasks(project_path, config)

    except KeyboardInterrupt:
        console.print("\n[yellow]Cancelled.[/]")
        raise SystemExit(0) from None
    except Exception as e:
        console.print(f"[red]Error:[/] {e}")
        raise SystemExit(1) from None


@cli.command()
@click.argument("name", type=str)
@click.option(
    "-o",
    "--output",
    type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path),
    default=None,
    help="Output directory",
)
@click.option(
    "--database",
    type=click.Choice(["postgresql", "mongodb", "sqlite"]),
    default="postgresql",
    help="Database type",
)
@click.option(
    "--orm",
    type=click.Choice(["sqlalchemy", "sqlmodel"]),
    default="sqlalchemy",
    help="ORM library (sqlalchemy or sqlmodel). SQLModel only works with PostgreSQL/SQLite",
)
@click.option("--no-logfire", is_flag=True, help="Disable Logfire integration")
@click.option("--no-docker", is_flag=True, help="Disable Docker files")
@click.option("--no-env", is_flag=True, help="Skip .env file generation")
@click.option("--minimal", is_flag=True, help="Create minimal project (no extras)")
@click.option(
    "--frontend",
    type=click.Choice(["none", "nextjs"]),
    default="none",
    help="Frontend framework",
)
@click.option(
    "--backend-port",
    type=int,
    default=8000,
    help="Backend server port (default: 8000)",
)
@click.option(
    "--frontend-port",
    type=int,
    default=3000,
    help="Frontend server port (default: 3000)",
)
@click.option(
    "--brand-color",
    type=click.Choice(["blue", "green", "red", "violet", "orange"]),
    default="blue",
    help="Brand color theme for frontend (default: blue)",
)
@click.option(
    "--timezone",
    type=str,
    default="UTC",
    help="IANA timezone (e.g. UTC, Europe/Warsaw, America/New_York)",
)
@click.option(
    "--db-pool-size",
    type=int,
    default=5,
    help="Database connection pool size (default: 5)",
)
@click.option(
    "--db-max-overflow",
    type=int,
    default=10,
    help="Database max overflow connections (default: 10)",
)
@click.option(
    "--ai-framework",
    type=click.Choice(["pydantic_ai", "langchain", "langgraph", "crewai", "deepagents"]),
    default="pydantic_ai",
    help="AI framework (default: pydantic_ai)",
)
@click.option(
    "--llm-provider",
    type=click.Choice(["openai", "anthropic", "google", "openrouter"]),
    default="openai",
    help="LLM provider (default: openai). Note: openrouter only works with pydantic_ai",
)
@click.option("--redis", is_flag=True, help="Enable Redis")
@click.option("--caching", is_flag=True, help="Enable caching (requires --redis)")
@click.option("--rate-limiting", is_flag=True, help="Enable rate limiting")
@click.option("--admin-panel", is_flag=True, help="Enable admin panel (SQLAdmin)")
@click.option(
    "--task-queue",
    type=click.Choice(["none", "celery", "taskiq", "arq"]),
    default="none",
    help="Background task queue",
)
@click.option("--oauth-google", is_flag=True, help="Enable Google OAuth")
@click.option("--session-management", is_flag=True, help="Enable session management")
@click.option("--kubernetes", is_flag=True, help="Generate Kubernetes manifests")
@click.option(
    "--ci",
    type=click.Choice(["github", "gitlab", "none"]),
    default="github",
    help="CI/CD system",
)
@click.option("--sentry", is_flag=True, help="Enable Sentry error tracking")
@click.option("--prometheus", is_flag=True, help="Enable Prometheus metrics")
@click.option("--file-storage", is_flag=True, help="Enable S3/MinIO file storage")
@click.option("--webhooks", is_flag=True, help="Enable webhooks support")
@click.option(
    "--langsmith",
    is_flag=True,
    help="Enable LangSmith observability (LangChain/LangGraph/DeepAgents)",
)
@click.option(
    "--python-version",
    type=click.Choice(["3.11", "3.12", "3.13"]),
    default="3.12",
    help="Python version",
)
@click.option(
    "--preset",
    type=click.Choice(["production", "ai-agent"]),
    default=None,
    help="Apply configuration preset",
)
@click.option(
    "--rag",
    is_flag=True,
    default=False,
    help="Enable RAG feature.",
)
@click.option(
    "--vector-store",
    type=click.Choice(["milvus", "qdrant", "chromadb", "pgvector"]),
    default="milvus",
    help="Vector store backend (default: milvus)",
)
@click.option(
    "--gdrive-rag",
    is_flag=True,
    default=False,
    help="Use Google Drive for document ingestion",
)
@click.option(
    "--s3-rag",
    is_flag=True,
    default=False,
    help="Use S3/MinIO for document ingestion",
)
@click.option(
    "--reranker",
    type=click.Choice(["none", "cohere", "cross_encoder"]),
    default="none",
    help="Choose reranking logic.",
)
@click.option(
    "--pdf-parser",
    type=click.Choice(["pymupdf", "liteparse", "llamaparse", "all"]),
    default="pymupdf",
    help="PDF parser (pymupdf=local, liteparse=local AI, llamaparse=cloud, all=runtime selection)",
)
@click.option("--telegram", is_flag=True, default=False, help="Enable Telegram notifications")
@click.option("--slack", is_flag=True, default=False, help="Enable Slack notifications")
@click.option("--teams", is_flag=True, default=False, help="Enable Teams/organizations feature")
@click.option(
    "--billing", is_flag=True, default=False, help="Enable Stripe billing (requires --teams)"
)
@click.option(
    "--credits",
    is_flag=True,
    default=False,
    help="Enable credits system (requires --billing)",
)
@click.option(
    "--usage-dashboard",
    is_flag=True,
    default=False,
    help="Enable usage dashboard (requires --credits)",
)
@click.option(
    "--anomaly-detection",
    is_flag=True,
    default=False,
    help="Enable usage anomaly detection (requires --credits)",
)
@click.option(
    "--slack-alerts",
    is_flag=True,
    default=False,
    help="Enable Slack alerts for anomalies (requires --anomaly-detection)",
)
@click.option(
    "--billing-currency",
    type=str,
    default="usd",
    help="Default billing currency (default: usd)",
)
@click.option(
    "--trial-days",
    type=int,
    default=14,
    help="Free trial length in days (default: 14)",
)
@click.option(
    "--trial-requires-card/--no-trial-requires-card",
    default=True,
    help="Require a payment card to start a trial (default: yes; pass --no-trial-requires-card to allow card-free trials)",
)
@click.option("--email", is_flag=True, default=False, help="Enable transactional email")
@click.option(
    "--email-provider",
    type=click.Choice(["resend", "smtp", "log"]),
    default="log",
    help="Email provider (default: log — prints to console)",
)
@click.option(
    "--newsletter",
    is_flag=True,
    default=False,
    help="Enable newsletter signup (requires --email)",
)
@click.option(
    "--marketing-site",
    is_flag=True,
    default=False,
    help="Generate marketing/landing pages",
)
@click.option("--changelog", is_flag=True, default=False, help="Generate changelog page")
@click.option("--testimonials", is_flag=True, default=False, help="Generate testimonials section")
@click.option(
    "--comparison-pages",
    is_flag=True,
    default=False,
    help="Generate competitor comparison pages",
)
@click.option(
    "--affiliate", is_flag=True, default=False, help="Generate affiliate program pages"
)
@click.option(
    "--status-badge", is_flag=True, default=False, help="Add status/uptime badge to frontend"
)
def create(
    name: str,
    output: Path | None,
    database: str,
    orm: str,
    no_logfire: bool,
    no_docker: bool,
    no_env: bool,
    minimal: bool,
    frontend: str,
    backend_port: int,
    frontend_port: int,
    db_pool_size: int,
    db_max_overflow: int,
    ai_framework: str,
    llm_provider: str,
    # Optional features
    redis: bool,
    caching: bool,
    rate_limiting: bool,
    admin_panel: bool,
    task_queue: str,
    oauth_google: bool,
    session_management: bool,
    kubernetes: bool,
    ci: str,
    sentry: bool,
    prometheus: bool,
    file_storage: bool,
    webhooks: bool,
    langsmith: bool,
    python_version: str,
    rag: bool,
    vector_store: str,
    gdrive_rag: bool,
    s3_rag: bool,
    reranker: str,
    pdf_parser: str,
    brand_color: str,
    timezone: str,
    preset: str | None,
    telegram: bool,
    slack: bool,
    teams: bool,
    billing: bool,
    credits: bool,
    usage_dashboard: bool,
    anomaly_detection: bool,
    slack_alerts: bool,
    billing_currency: str,
    trial_days: int,
    trial_requires_card: bool,
    email: bool,
    email_provider: str,
    newsletter: bool,
    marketing_site: bool,
    changelog: bool,
    testimonials: bool,
    comparison_pages: bool,
    affiliate: bool,
    status_badge: bool,
) -> None:
    """Create a new FastAPI project with specified options.

    NAME is the project name (e.g., my_project)
    """
    try:
        # Handle presets first
        if preset == "production":
            config = ProjectConfig(
                project_name=name,
                database=DatabaseType.POSTGRESQL,
                enable_logfire=True,
                enable_redis=True,
                enable_caching=True,
                enable_rate_limiting=True,
                enable_sentry=True,
                enable_prometheus=True,
                enable_docker=True,
                enable_kubernetes=True,
                ci_type=CIType.GITHUB,
                generate_env=not no_env,
                frontend=FrontendType(frontend),
                brand_color=BrandColorType(brand_color),
                backend_port=backend_port,
                frontend_port=frontend_port,
                python_version=python_version,
                timezone=timezone,
            )
        elif preset == "ai-agent":
            config = ProjectConfig(
                project_name=name,
                database=DatabaseType.POSTGRESQL,
                enable_logfire=True,
                enable_redis=True,
                enable_websockets=True,
                ai_framework=AIFrameworkType(ai_framework),
                llm_provider=LLMProviderType(llm_provider),
                enable_langsmith=ai_framework in ("langchain", "langgraph", "deepagents"),
                enable_docker=True,
                ci_type=CIType.GITHUB,
                generate_env=not no_env,
                frontend=FrontendType(frontend),
                brand_color=BrandColorType(brand_color),
                backend_port=backend_port,
                frontend_port=frontend_port,
                python_version=python_version,
                timezone=timezone,
            )
        elif minimal:
            config = ProjectConfig(
                project_name=name,
                database=DatabaseType.SQLITE,
                enable_logfire=False,
                enable_redis=False,
                enable_caching=False,
                enable_rate_limiting=False,
                enable_pagination=False,
                enable_admin_panel=False,
                enable_docker=False,
                enable_kubernetes=False,
                background_tasks=BackgroundTaskType.NONE,
                ci_type=CIType.NONE,
                generate_env=not no_env,
                frontend=FrontendType(frontend),
                brand_color=BrandColorType(brand_color),
                backend_port=backend_port,
                frontend_port=frontend_port,
                python_version=python_version,
                timezone=timezone,
            )
        else:
            # Full custom configuration with all options
            config = ProjectConfig(
                project_name=name,
                database=DatabaseType(database),
                orm_type=OrmType(orm),
                enable_logfire=not no_logfire,
                enable_docker=not no_docker,
                generate_env=not no_env,
                frontend=FrontendType(frontend),
                brand_color=BrandColorType(brand_color),
                backend_port=backend_port,
                frontend_port=frontend_port,
                db_pool_size=db_pool_size,
                db_max_overflow=db_max_overflow,
                ai_framework=AIFrameworkType(ai_framework),
                llm_provider=LLMProviderType(llm_provider),
                enable_redis=redis,
                enable_caching=caching,
                enable_rate_limiting=rate_limiting,
                enable_admin_panel=admin_panel,
                background_tasks=BackgroundTaskType(task_queue),
                oauth_provider=OAuthProvider.GOOGLE if oauth_google else OAuthProvider.NONE,
                enable_session_management=session_management,
                enable_kubernetes=kubernetes,
                ci_type=CIType(ci),
                enable_sentry=sentry,
                enable_prometheus=prometheus,
                enable_file_storage=file_storage,
                enable_webhooks=webhooks,
                enable_langsmith=langsmith,
                python_version=python_version,
                timezone=timezone,
                rag_features=RAGFeatures(
                    enable_rag=rag,
                    vector_store=VectorStoreType(vector_store),
                    enable_google_drive_ingestion=gdrive_rag,
                    enable_s3_ingestion=s3_rag,
                    reranker_type=RerankerType(reranker),
                    pdf_parser=PdfParserType(pdf_parser),
                ),
                use_telegram=telegram,
                use_slack=slack,
                enable_teams=teams,
                enable_billing=billing,
                enable_credits_system=credits,
                enable_usage_dashboard=usage_dashboard,
                enable_usage_anomaly_detection=anomaly_detection,
                enable_slack_alerts=slack_alerts,
                billing_default_currency=billing_currency,
                billing_trial_days_default=trial_days,
                billing_trial_requires_card=trial_requires_card,
                enable_email=email,
                email_provider=EmailProviderType(email_provider),
                enable_newsletter_signup=newsletter,
                enable_marketing_site=marketing_site,
                enable_changelog=changelog,
                enable_testimonials=testimonials,
                enable_comparison_pages=comparison_pages,
                enable_affiliate_program=affiliate,
                enable_status_badge=status_badge,
            )

        console.print(f"[cyan]Creating project:[/] {name}")
        if preset:
            console.print(f"[dim]Preset: {preset}[/]")
        console.print(f"[dim]Database: {config.database.value}[/]")
        console.print("[dim]Auth: JWT + API Key[/]")
        if config.frontend != FrontendType.NONE:
            console.print(f"[dim]Frontend: {config.frontend.value}[/]")
        console.print(
            f"[dim]AI Agent: {config.ai_framework.value} ({config.llm_provider.value})[/]"
        )
        if config.background_tasks != BackgroundTaskType.NONE:
            console.print(f"[dim]Task Queue: {config.background_tasks.value}[/]")
        console.print()

        project_path = generate_project(config, output)
        post_generation_tasks(project_path, config)

    except ValueError as e:
        console.print(f"[red]Invalid configuration:[/] {e}")
        raise SystemExit(1) from None
    except Exception as e:
        console.print(f"[red]Error:[/] {e}")
        raise SystemExit(1) from None


@cli.command()
def templates() -> None:
    """List available template options."""
    console.print("[bold cyan]Full-Stack AI Agent Template — Available Options[/]")
    console.print()

    console.print("[bold]Presets:[/]")
    console.print("  --preset production   Full production setup (Redis, Sentry, K8s, etc.)")
    console.print(
        "  --preset ai-agent     AI agent with WebSocket streaming + conversation persistence"
    )
    console.print("  --minimal             Minimal project (SQLite, no Docker/K8s/CI, no Redis)")
    console.print()

    console.print("[bold]Databases:[/]")
    console.print("  --database postgresql  PostgreSQL with asyncpg (async)")
    console.print("  --database mongodb     MongoDB with Motor (async)")
    console.print("  --database sqlite      SQLite with SQLAlchemy (sync)")
    console.print("  --orm sqlalchemy       SQLAlchemy (default)")
    console.print("  --orm sqlmodel         SQLModel (PostgreSQL/SQLite only)")
    console.print()

    console.print("[bold]Authentication (always included):[/]")
    console.print("  JWT + User Management (email/password, roles, profiles)")
    console.print("  API Key utility (X-API-Key header, available for custom use)")
    console.print("  --oauth-google         Enable Google OAuth")
    console.print("  --session-management   Enable session management")
    console.print()

    console.print("[bold]AI Agent:[/]")
    console.print("  --ai-framework pydantic_ai      PydanticAI (recommended)")
    console.print("  --ai-framework langchain        LangChain")
    console.print("  --ai-framework langgraph        LangGraph (ReAct agent)")
    console.print("  --ai-framework crewai           CrewAI (multi-agent crews)")
    console.print("  --ai-framework deepagents       DeepAgents (agentic coding, HITL)")
    console.print("  --llm-provider openai           OpenAI (gpt-4o-mini)")
    console.print("  --llm-provider anthropic        Anthropic (claude-sonnet-4-5)")
    console.print("  --llm-provider google           Google Gemini (gemini-2.0-flash)")
    console.print("  --llm-provider openrouter       OpenRouter (pydantic_ai only)")
    console.print()

    console.print("[bold]Background Tasks:[/]")
    console.print("  --task-queue none      FastAPI BackgroundTasks only")
    console.print("  --task-queue celery    Celery (classic)")
    console.print("  --task-queue taskiq    Taskiq (async-native)")
    console.print("  --task-queue arq       ARQ (lightweight)")
    console.print()

    console.print("[bold]Frontend:[/]")
    console.print("  --frontend none        API only (no frontend)")
    console.print("  --frontend nextjs      Next.js 15 (App Router, TypeScript, Bun, i18n)")
    console.print()

    console.print("[bold]RAG (Retrieval Augmented Generation):[/]")
    console.print("  --rag                               Enable RAG")
    console.print("  --vector-store milvus|qdrant|chromadb|pgvector  Vector store backend")
    console.print("  --gdrive-rag                        Enable Google Drive ingestion")
    console.print("  --reranker none|cohere|cross_encoder Reranker logic")
    console.print("  --pdf-parser pymupdf|liteparse|llamaparse  PDF parser")
    console.print()

    console.print("[bold]Integrations:[/]")
    console.print("  --redis            Enable Redis")
    console.print("  --caching          Enable caching (requires --redis)")
    console.print("  --rate-limiting    Enable rate limiting")
    console.print("  --admin-panel      Enable admin panel (SQLAdmin)")
    console.print("  --file-storage     Enable S3/MinIO file storage")
    console.print("  --webhooks         Enable webhooks support")
    console.print()

    console.print("[bold]Observability:[/]")
    console.print("  --no-logfire       Disable Logfire integration (PydanticAI)")
    console.print("  --langsmith        Enable LangSmith (LangChain/LangGraph/DeepAgents)")
    console.print("  --sentry           Enable Sentry error tracking")
    console.print("  --prometheus       Enable Prometheus metrics")
    console.print()

    console.print("[bold]DevOps:[/]")
    console.print("  --no-docker        Disable Docker files")
    console.print("  --kubernetes       Generate Kubernetes manifests")
    console.print("  --ci github        GitHub Actions (default)")
    console.print("  --ci gitlab        GitLab CI")
    console.print("  --ci none          No CI/CD")
    console.print()

    console.print("[bold]Other:[/]")
    console.print("  --python-version 3.11|3.12|3.13  Python version")
    console.print("  --no-env           Skip .env file generation")
    console.print("  --backend-port N   Backend port (default: 8000)")
    console.print("  --frontend-port N  Frontend port (default: 3000)")


def main() -> None:
    """Main entry point."""
    cli()


if __name__ == "__main__":  # pragma: no cover
    main()
