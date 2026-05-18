# Deployment

This project was generated with the following deployment-related flags:

- ❌ No Docker (manual deploy)
- ❌ No Kubernetes manifests
- CI: `none`



---





## Platform-specific quickstarts

### Fly.io

```bash
fly launch --name llm_quality_eval-backend --region waw

fly secrets set $(cat backend/.env | grep -v '^#' | xargs)
fly deploy
```

### Railway

1. Connect repo, pick Dockerfile-based deploy.
2. Add env vars from `backend/.env` to Railway service.
5. Deploy.

### Render

1. Create Web Service → docker, point at `backend/Dockerfile`.
4. Add env vars; deploy.

### Vercel (frontend only)

Not applicable — this project doesn't generate a frontend.


---

## Environment validation in production

Before promoting to prod, run:

```bash
docker compose exec app uv run python -c "from app.core.config import settings; print('OK')"
```

Catches missing required env vars early. See `ENV_VARS.md` for the full list.

## Post-deploy checks

- [ ] `/api/v1/health` returns `{"status": "ok"}`
- [ ] `alembic current` matches expected revision
- [ ] Logs flowing to your aggregator
- [ ] Reverse proxy enforces HTTPS

## Rollback

- **Schema:** `alembic downgrade -1` rolls back one migration. Test on staging first.
- **Code:** redeploy previous image tag. Pin tags (`v1.2.3`), never deploy `latest` to prod.
- **Data:** restore from your most recent backup; verify `alembic current` matches the data version.
