.PHONY: install format lint test run clean help db-init dev dev-down dev-logs dev-rebuild stage prod

# === Environments ============================================================
# `make dev`   — local development (docker-compose.dev.yml + hot-reload + bind mounts)
# `make stage` — staging (docker-compose.yml, prod-like, no bind mounts)
# `make prod`  — production (docker-compose.prod.yml + external Nginx, requires .env.prod)
# Each env exposes: -down, -logs, -rebuild siblings.

# Wait for the postgres container to accept connections. Polls pg_isready
# rather than a fixed sleep — survives slow startups + Docker pulls.
define _wait_for_db
	@echo "Waiting for PostgreSQL ($(1))..."
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do \
		if docker compose -f $(1) exec -T db pg_isready -U postgres >/dev/null 2>&1; then \
			echo "  ✅ DB ready"; exit 0; \
		fi; \
		printf '.'; sleep 2; \
	done; \
	echo "  ❌ DB not ready after 30s — check 'make dev-logs'"; exit 1
endef

# === Quick Start (one command to rule them all) ===
# Local dev workflow — builds images, starts services, waits for DB, runs
# pre-baked migrations, seeds an admin user. Idempotent — re-run anytime.
dev:
	@echo "▶ Building backend image…"
	docker compose -f docker-compose.dev.yml build app
	@echo "▶ Starting services…"
	docker compose -f docker-compose.dev.yml up -d
	$(call _wait_for_db,docker-compose.dev.yml)
	@echo "▶ Applying migrations…"
	docker compose -f docker-compose.dev.yml exec -T app ai_agent_2 db upgrade
	@echo "▶ Seeding admin (admin@example.com / admin123)…"
	@docker compose -f docker-compose.dev.yml exec -T app \
		ai_agent_2 user create \
			--email admin@example.com --password admin123 --superuser \
		2>/dev/null || echo "  (admin already exists)"
	@echo ""
	@echo "🚀 Dev stack ready:"
	@echo "   API:      http://localhost:8000        ($(APP_NAME) backend)"
	@echo "   Docs:     http://localhost:8000/docs"
	@echo "   Admin:    http://localhost:8000/admin  (admin@example.com / admin123)"
	@echo "   Frontend: http://localhost:3000        (run 'make dev-frontend' or 'cd frontend && bun dev')"

dev-down:
	docker compose -f docker-compose.dev.yml down

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f

dev-rebuild:
	docker compose -f docker-compose.dev.yml build --no-cache app
	docker compose -f docker-compose.dev.yml up -d --force-recreate app

dev-frontend:
	docker compose -f docker-compose.frontend.yml up -d
	@echo ""
	@echo "✅ Frontend at http://localhost:3000 (backend must be up — 'make dev')"

# === Staging — same compose as dev, no live-reload bind mounts ===
stage:
	docker compose -f docker-compose.yml up -d --build
	$(call _wait_for_db,docker-compose.yml)
	docker compose -f docker-compose.yml exec -T app ai_agent_2 db upgrade
	@echo "✅ Staging stack up at http://localhost:8000"

stage-down:
	docker compose -f docker-compose.yml down

# === Quickstart alias (legacy, kept for backwards-compatibility) ===
quickstart: dev

# === Setup ===
install:
	uv sync --directory backend --dev
	@if git rev-parse --git-dir > /dev/null 2>&1; then \
		uv run --directory backend pre-commit install; \
	else \
		echo "⚠️  Not a git repository - skipping pre-commit install"; \
		echo "   Run 'git init && make install' to set up pre-commit hooks"; \
	fi
	@echo ""
	@echo "✅ Installation complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  • make docker-db        # Start PostgreSQL"
	@echo "  • make db-upgrade       # Apply migrations"
	@echo "  • make run              # Start development server"
	@echo ""
	@echo "Note: backend/.env is pre-configured for development"

# === Code Quality ===
format:
	uv run --directory backend ruff format app tests cli
	uv run --directory backend ruff check app tests cli --fix

lint:
	uv run --directory backend ruff check app tests cli
	uv run --directory backend ruff format app tests cli --check
	uv run --directory backend ty check

# === Testing ===
test:
	uv run --directory backend pytest tests/ -v

test-cov:
	uv run --directory backend pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing

# === Database ===
db-init: docker-db
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 8
	cd backend && uv run ai_agent_2 db migrate -m "initial" || true
	cd backend && uv run ai_agent_2 db upgrade
	@echo ""
	@echo "✅ Database initialized!"

db-migrate:
	@read -p "Migration message: " msg; \
	uv run --directory backend ai_agent_2 db migrate -m "$$msg"

db-upgrade:
	uv run --directory backend ai_agent_2 db upgrade

db-downgrade:
	uv run --directory backend ai_agent_2 db downgrade

db-current:
	uv run --directory backend ai_agent_2 db current

db-history:
	uv run --directory backend ai_agent_2 db history

# === Server ===
run:
	uv run --directory backend ai_agent_2 server run --reload

run-prod:
	uv run --directory backend ai_agent_2 server run --host 0.0.0.0 --port 8000

routes:
	uv run --directory backend ai_agent_2 server routes

# === Users ===
create-admin:
	@echo "Creating admin user..."
	uv run --directory backend ai_agent_2 user create-admin

user-create:
	uv run --directory backend ai_agent_2 user create

user-list:
	uv run --directory backend ai_agent_2 user list

# === Celery ===
celery-worker:
	uv run --directory backend ai_agent_2 celery worker

celery-beat:
	uv run --directory backend ai_agent_2 celery beat

celery-flower:
	uv run --directory backend ai_agent_2 celery flower
	@echo ""
	@echo "✅ Flower started at http://localhost:5555"

# === Docker: Backend (Development) ===
docker-up:
	docker-compose build app
	docker-compose up -d
	@echo ""
	@echo "✅ Backend services started!"
	@echo "   API: http://localhost:8000"
	@echo "   Docs: http://localhost:8000/docs"
	@echo "   Flower: http://localhost:5555"
	@echo "   PostgreSQL: localhost:5432"
	@echo "   Redis: localhost:6379"

docker-down:
	docker-compose down
	docker-compose -f docker-compose.frontend.yml down 2>/dev/null || true

docker-logs:
	docker-compose logs -f

docker-build:
	docker-compose build

docker-shell:
	docker-compose exec app /bin/bash

# === Docker: Frontend (Development) ===
docker-frontend:
	docker-compose -f docker-compose.frontend.yml up -d
	@echo ""
	@echo "✅ Frontend started!"
	@echo "   URL: http://localhost:3000"
	@echo ""
	@echo "Note: Backend must be running (make docker-up)"

docker-frontend-down:
	docker-compose -f docker-compose.frontend.yml down

docker-frontend-logs:
	docker-compose -f docker-compose.frontend.yml logs -f

docker-frontend-build:
	docker-compose -f docker-compose.frontend.yml build

# === Docker: Production (with Traefik) ===
docker-prod:
	docker-compose -f docker-compose.prod.yml up -d
	@echo ""
	@echo "✅ Production services started with Traefik!"
	@echo ""
	@echo "Endpoints (replace DOMAIN with your domain):"
	@echo "   Frontend: https://$$DOMAIN"
	@echo "   API: https://api.$$DOMAIN"
	@echo "   Flower: https://flower.$$DOMAIN"
	@echo "   Traefik: https://traefik.$$DOMAIN"

docker-prod-down:
	docker-compose -f docker-compose.prod.yml down

docker-prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f

docker-prod-build:
	docker-compose -f docker-compose.prod.yml build

# === Docker: Individual Services ===
docker-db:
	docker-compose up -d db
	@echo ""
	@echo "✅ PostgreSQL started on port 5432"
	@echo "   Connection: postgresql://postgres:postgres@localhost:5432/ai_agent_2"

docker-db-stop:
	docker-compose stop db

docker-redis:
	docker-compose up -d redis
	@echo ""
	@echo "✅ Redis started on port 6379"

docker-redis-stop:
	docker-compose stop redis

# === Vercel (Frontend Deployment) ===
vercel-deploy:
	cd frontend && npx vercel --prod
	@echo ""
	@echo "✅ Frontend deployed to Vercel!"
	@echo "   Set environment variables in Vercel dashboard:"
	@echo "   BACKEND_URL=https://api.your-domain.com"
	@echo "   BACKEND_WS_URL=wss://api.your-domain.com"
	@echo "   NEXT_PUBLIC_AUTH_ENABLED=true"
	@echo "   NEXT_PUBLIC_RAG_ENABLED=true"

# === Cleanup ===
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ty_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf htmlcov/ .coverage coverage.xml

# === Help ===
help:
	@echo ""
	@echo "ai_agent_2 - Available Commands"
	@echo "======================================"
	@echo ""
	@echo "Quick Start:"
	@echo "  make quickstart    Install + start all services + setup DB"
	@echo ""
	@echo "Setup:"
	@echo "  make install       Install dependencies + pre-commit hooks"
	@echo ""
	@echo "Development:"
	@echo "  make run           Start dev server (with hot reload)"
	@echo "  make test          Run tests"
	@echo "  make lint          Check code quality"
	@echo "  make format        Auto-format code"
	@echo ""
	@echo "Database:"
	@echo "  make db-init       Initialize database (start + migrate)"
	@echo "  make db-migrate    Create new migration"
	@echo "  make db-upgrade    Apply migrations"
	@echo "  make db-downgrade  Rollback last migration"
	@echo "  make db-current    Show current migration"
	@echo ""
	@echo "Users:"
	@echo "  make create-admin  Create admin user (for SQLAdmin access)"
	@echo "  make user-create   Create new user (interactive)"
	@echo "  make user-list     List all users"
	@echo ""
	@echo "RAG:"
	@echo "  uv run ai_agent_2 rag-ingest <path> -c <collection>  Ingest files"
	@echo "  uv run ai_agent_2 rag-search <query> -c <collection>  Search"
	@echo "  uv run ai_agent_2 rag-collections                     List collections"
	@echo "  uv run ai_agent_2 rag-sources                         List sync sources"
	@echo "  uv run ai_agent_2 rag-source-add                      Add sync source"
	@echo "  uv run ai_agent_2 rag-source-sync <id>                Trigger sync"
	@echo ""
	@echo "Celery:"
	@echo "  make celery-worker  Start Celery worker"
	@echo "  make celery-beat    Start Celery beat scheduler"
	@echo "  make celery-flower  Start Flower monitoring UI"
	@echo ""
	@echo "Docker (Development):"
	@echo "  make docker-up            Start backend services"
	@echo "  make docker-down          Stop all services"
	@echo "  make docker-logs          View backend logs"
	@echo "  make docker-build         Build backend images"
	@echo "  make docker-frontend      Start frontend (separate)"
	@echo "  make docker-frontend-down Stop frontend"
	@echo "  make docker-db            Start only PostgreSQL"
	@echo "  make docker-redis         Start only Redis"
	@echo ""
	@echo "Docker (Production with Traefik):"
	@echo "  make docker-prod          Start production stack"
	@echo "  make docker-prod-down     Stop production stack"
	@echo "  make docker-prod-logs     View production logs"
	@echo ""
	@echo "Other:"
	@echo "  make routes        Show all API routes"
	@echo "  make clean         Clean cache files"
	@echo ""
