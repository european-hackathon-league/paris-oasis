# MSD Floor-Plan — visualization web app

A Next.js (App Router) + Tailwind site that visualizes the challenge data and the
evaluation pipeline. It is **self-contained**: all floor-plan renders and stats are
baked into `public/data/` at asset-generation time, so the app needs **neither the
16 GB dataset nor the Python pipeline at runtime**. The pipeline view is illustrative
only — nothing is executed in the browser.

## Local development

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

## Regenerating the baked assets

Renders + `data.json` are produced from the dataset by the Python pipeline (needs the
dataset in `../data/` and the repo `.venv`):

```bash
# from the repo root
.venv/bin/python web/scripts/generate_assets.py
```

This overwrites `web/public/data/data.json` and `web/public/data/samples/*.png`.
Those baked assets **are committed** so deployment never touches the dataset.

## Production build

```bash
npm run build && npm start      # standalone server on :3000
```

## Deploy with Docker / Coolify

The app builds to a standalone server and is containerized.

```bash
# from the repo root
docker compose up -d --build     # serves on http://<host>:3000
```

**Coolify (Hetzner):**
1. New Resource → Docker Compose → point it at this repo.
2. Coolify auto-detects `docker-compose.yml` (build context `./web`).
3. Set the domain; the service listens on container port **3000**.
4. Deploy. The health check hits `/` every 30s.

No environment variables are required. The image is built from `web/Dockerfile`
(multi-stage, `node:22-alpine`, Next.js standalone output, runs as non-root).
