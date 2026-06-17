# GeoSpatial — Remote Sensing SaaS Platform

A full-stack platform for processing, analyzing, and visualizing satellite imagery (SAR and optical) at scale.

---

## Architecture Overview

**Personal / free-tier setup** (recommended for hobby use):

```
┌─────────────────────────────────────────────────────────┐
│              GitHub Pages (free, static CDN)               │
│          React + TypeScript + Vite + Leaflet             │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS (JWT Bearer)
┌──────────────────────▼──────────────────────────────────┐
│         Render free web service (sleeps when idle)         │
│    FastAPI — processes analyses inline (no worker)         │
└──────────────────────────┬───────────────────────────────┘
                           │
                  ┌────────▼────────┐
                  │  Neon Postgres  │
                  │   (free tier)   │
                  └─────────────────┘
```

For local development with the full stack (Redis + Celery worker), use `docker compose up`.
For personal cloud hosting, use `docker compose -f docker-compose.personal.yml up` locally
or deploy with `render.yaml` — **$0/month**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Leaflet |
| State | Zustand, TanStack Query |
| Backend | FastAPI, SQLAlchemy 2.0 async, Alembic |
| Auth | JWT (access + refresh tokens), RBAC (admin/analyst/viewer) |
| Task Queue | Celery + Redis *(optional — inline mode for free hosting)* |
| Image Processing | NumPy, SciPy, Pillow, Rasterio |
| AI Summaries | Google Gemini 1.5 Flash *(optional — rule-based fallback)* |
| Database | PostgreSQL (async via asyncpg) |
| Storage | Cloudflare R2 *(optional — demo mode needs no storage)* |
| Maps | Leaflet + OpenStreetMap + Stadia dark tiles |

---

## Processing Pipeline

```
Raw SAR / Optical Imagery
        │
        ▼
  [Ingestion + Validation]
        │
        ▼
  [Lanczos Spatial Rescaling]  ← resolution_scale param
        │
        ▼
  ┌─────────────────────────┐
  │  SAR: Lee Speckle Filter│  ← multiplicative noise model
  │  Optical: Gaussian + B. │  ← additive noise reduction
  └─────────────────────────┘
        │
        ▼
  [NDVI / Backscatter / Diff computation]
        │
        ▼
  [Z-score Anomaly Detection]  ← configurable sigma threshold
        │
        ▼
  [Morphological cleanup]      ← removes salt-and-pepper
        │
        ▼
  PNG export (base64) + JSON stats
        │
        ▼
  Gemini 1.5 Flash summary
```

---

## Getting Started (Local)

### Prerequisites
- Docker + Docker Compose v2
- Node 20+ (for frontend-only dev)

### 1. Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/geospatial-saas.git
cd "geospatial-saas"

# Backend env
cp backend/.env.example backend/.env
# Edit backend/.env with your Gemini key, etc.
```

### 2. Start (personal / lightweight)

```bash
docker compose -f docker-compose.personal.yml up --build
```

No Redis or Celery worker — analyses run inline in the API. Fine for solo use.

For the full stack (async workers, Flower monitor):

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend (Vite HMR) | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/api/docs |
| Celery Monitor (Flower) | http://localhost:5555 (admin/admin) |
| PostgreSQL | localhost:5432 |

### 3. First login
Register at http://localhost:5173/register — the first user is auto-created as **viewer**. Promote yourself to **analyst** or **admin** via the Admin panel (you'll need to temporarily bump your role in the DB first).

---

## Deployment Guide — $0/month (Personal / Hobby)

This project is designed to run entirely on free tiers. You do **not** need Redis, a Celery worker, or paid object storage for demo analyses.

| Component | Provider | Cost | Notes |
|---|---|---|---|
| Frontend | **GitHub Pages** | Free | Static React build, auto-deploy via Actions |
| API | **Render** | Free | Sleeps after ~15 min idle; ~30s cold start |
| PostgreSQL | **Neon** | Free | 0.5 GB storage, enough for personal use |
| AI summaries | **Google AI Studio** | Free | Optional; rule-based text works without a key |
| Maps | **OpenStreetMap** | Free | No API key required |
| File storage | *(skip)* | — | Demo mode uses synthetic imagery |
| **Total** | | **$0** | |

### What you can skip on free hosting

- **Redis + Celery** — set `INLINE_PROCESSING=true` (already in `render.yaml`). Analyses complete in the same request (~1–3 seconds for demo data).
- **Cloudflare R2 / S3** — demo analyses never upload real GeoTIFFs.
- **Gemini API key** — summaries fall back to deterministic rule-based text.
- **Separate worker service** — Render free tier only allows one web service anyway.

### Trade-offs (fine for a personal site)

- Render free tier **sleeps when idle** — first visit after a while takes ~30 seconds to wake up.
- Inline processing blocks one API thread during analysis — irrelevant at low traffic.
- Neon free tier may **pause** after extended inactivity (wake on connect).

---

### Step 1 — Frontend on GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Add repo secret `VITE_API_URL` = your Render API URL (e.g. `https://geospatial-api.onrender.com`).
4. Edit `.github/workflows/deploy.yml` — set `VITE_BASE_PATH` to `/your-repo-name/`.
5. Edit `frontend/public/404.html` — set `var base` to the same path.
6. Push to `main` → frontend deploys automatically.

### Step 2 — Database on Neon (free)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string for `DATABASE_URL` — change the scheme to:
   `postgresql+asyncpg://...`
3. Copy the **direct** connection string for `SYNC_DATABASE_URL`:
   `postgresql://...`
4. Append `?sslmode=require` if not already present.

### Step 3 — API on Render (free)

**Option A — Blueprint (easiest)**

1. In [render.com](https://render.com): **New → Blueprint** → connect your GitHub repo.
2. Render reads `render.yaml` from the repo root.
3. When prompted, paste your Neon `DATABASE_URL` and `SYNC_DATABASE_URL`.
4. Set `CORS_ORIGINS` to `https://YOUR_USERNAME.github.io`.
5. Optionally set `GEMINI_API_KEY` from [aistudio.google.com](https://aistudio.google.com).

**Option B — Manual web service**

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Plan | Free |

Required env vars:

```
INLINE_PROCESSING=true
DATABASE_URL=postgresql+asyncpg://...
SYNC_DATABASE_URL=postgresql://...
SECRET_KEY=<random 32+ char string>
CORS_ORIGINS=https://YOUR_USERNAME.github.io
GEMINI_API_KEY=          # optional
```

### Step 4 — Promote yourself to analyst

New accounts register as `viewer`. After your first login, run this once in the Neon SQL editor:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Optional upgrades (still free, more moving parts)

Only add these if you outgrow inline processing:

| Component | Provider | Cost |
|---|---|---|
| Redis | **Upstash** | Free (10k commands/day) |
| Celery worker | Second Render service | Not free — use inline instead |
| Object storage | **Cloudflare R2** | Free (10 GB) |
| Database alt | **Supabase** | Free (500 MB) |

Set `INLINE_PROCESSING=false` and configure Redis URLs to enable the Celery worker locally or on a VPS.

---

## Paid hosting (only if you need always-on + workers)

If traffic grows and cold starts become annoying:

| Component | Provider | Approx. cost |
|---|---|---|
| API + worker | Railway, Fly.io | ~$5–10/mo |
| PostgreSQL | Neon Pro or Railway | ~$0–5/mo |

For a personal interest site with occasional visitors, the free stack above is the right choice.

---

## Memory Management Strategy

Processing 500 MB+ GeoTIFF files without OOM:

- **Windowed reads** via rasterio — load only the spatial extent covered by the user's drawn region
- **Tiled processing** — split large arrays into 512×512 tiles, process, then mosaic
- **NumPy memory-maps** — read arrays directly from disk without full allocation
- **Celery task isolation** — optional; use `INLINE_PROCESSING=true` on free hosts instead
- **Result compression** — output images are downscaled PNGs (base64) never raw arrays in the DB
- **Worker `--concurrency=4`** — caps simultaneous jobs to prevent RAM exhaustion

---

## RBAC Roles

| Role | Capabilities |
|---|---|
| `viewer` | View analyses and regions (read-only) |
| `analyst` | Create/run analyses, draw regions, cancel jobs |
| `admin` | All analyst permissions + user management, role assignment |

---

## Project Structure

```
geospatial-saas/
├── backend/
│   ├── app/
│   │   ├── core/           # config, database, security
│   │   ├── models/         # SQLAlchemy ORM (User, Region, Analysis)
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── api/routes/     # REST endpoints
│   │   ├── services/       # image_processing, gemini_service
│   │   └── workers/        # Celery tasks
│   ├── requirements.txt
│   ├── Dockerfile
│   └── Dockerfile.worker
├── frontend/
│   ├── src/
│   │   ├── components/     # MapView, AnalysisForm, ResultCard, Navbar…
│   │   ├── pages/          # Dashboard, Map, Analysis, Detail, Admin
│   │   ├── hooks/          # usePolling
│   │   ├── services/       # api.ts (axios client)
│   │   ├── store/          # authStore, mapStore (Zustand)
│   │   └── types/          # TypeScript interfaces
│   ├── public/
│   │   └── 404.html        # GitHub Pages SPA routing fix
│   └── vite.config.ts
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages CD
├── docker-compose.yml          # Full stack (API + worker + Redis)
├── docker-compose.personal.yml # Lightweight (API + Postgres only)
├── render.yaml                 # Free Render blueprint
└── README.md
```
