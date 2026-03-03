# Ganttlet

[![CI](https://github.com/emcniece/ganttlet/actions/workflows/ci.yml/badge.svg)](https://github.com/emcniece/ganttlet/actions/workflows/ci.yml)
[![Deploy](https://github.com/emcniece/ganttlet/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/emcniece/ganttlet/actions/workflows/deploy-pages.yml)

A free Gantt chart tool. Works entirely in the browser with no signup required — or connect to a backend for auth, cloud save, and sharing.

**[Try it live](https://ganttlet.emc2.build)**

## Features

- **Interactive Gantt chart** powered by frappe-gantt — drag to move, resize to adjust, click to edit
- **Multiple view modes** — switch between Day, Week, Month, and Year views
- **Task management** — add, edit, and delete tasks with a form-based UI
- **Task colors** — assign colors to tasks for visual grouping
- **Dependencies** — link tasks together with dependency arrows; interactive endpoint handles for linking/unlinking
- **Drag-to-reorder** — vertically drag chart bars or table rows to reorder tasks
- **Undo/redo** — Ctrl+Z / Ctrl+Shift+Z to undo and redo task mutations
- **Multi-project support** — create, rename, switch between, and delete projects
- **Chart date range** — optionally set start/end dates in Settings to constrain the visible timeline
- **JSON import/export** — save your project to a file, load it back anytime
- **CSV import** — import tasks from CSV files or published Google Sheets
- **PNG export** — download a cropped, high-resolution image with date headers
- **Google Sheets export** — push tasks to a Google Sheet via OAuth
- **User accounts** — register with email/password or sign in with Google/GitHub OAuth
- **Cloud save** — tasks sync to the server automatically when logged in
- **Sharing** — invite users by email with view or edit roles; set project visibility to private, unlisted, or public
- **Offline-first** — works fully without a backend using localStorage; auth UI hidden when no backend is reachable
- **Privacy Policy & Terms of Service** — accessible via footer links or direct URL (`#/privacy`, `#/terms`)

## Project Structure

```
ganttlet/
├── packages/
│   ├── shared/          # Shared types + Zod validation schemas
│   ├── frontend/        # React SPA (Vite + Tailwind)
│   └── backend/         # Express API (SQLite + Drizzle ORM)
├── k8s/                 # Kubernetes manifests
├── Dockerfile
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Install

```bash
npm install
```

### Frontend only (no backend)

```bash
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173). The app runs in offline mode with localStorage persistence. No auth UI is shown.

### Full stack (frontend + backend)

1. Copy the environment file and edit as needed:

```bash
cp .env.example .env
```

2. Start the backend (serves API on port 3000):

```bash
npm run dev:backend
```

3. In a separate terminal, start the frontend (proxies `/api` to the backend):

```bash
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173). Sign In and Share buttons will appear once the backend is reachable.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Backend listen port |
| `DATABASE_PATH` | `./data/ganttlet.db` | SQLite database file path |
| `SESSION_SECRET` | — | Secret for signing session cookies (required) |
| `BASE_URL` | `http://localhost:3000` | Public URL of the backend |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin for the frontend |
| `STATIC_DIR` | — | Path to frontend `dist/` (production only) |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret (optional) |
| `GITHUB_CLIENT_ID` | — | GitHub OAuth client ID (optional) |
| `GITHUB_CLIENT_SECRET` | — | GitHub OAuth client secret (optional) |
| `VITE_API_URL` | `/api` | Frontend API base URL (build-time, for static deploys pointing to a remote backend) |
| `VITE_BASE_PATH` | `/` | Vite base path (build-time) |

## Build

```bash
npm run build          # Build all workspaces (shared → frontend → backend)
npm run build:frontend # Build frontend only
npm run build:backend  # Build backend only
```

Frontend output is in `packages/frontend/dist/`. Backend output is in `packages/backend/dist/`.

## Testing

```bash
npm test               # Run all tests (frontend + backend)
npm run test:frontend  # Frontend tests only
npm run test:backend   # Backend tests only
```

## Docker

Build and run the full application with Docker:

```bash
docker compose up --build
```

The app serves on [http://localhost:3000](http://localhost:3000) with the API and frontend bundled together. SQLite data persists in a Docker volume.

To configure OAuth or change the session secret, set environment variables in `.env` or directly in `docker-compose.yml`.

## Deployment

### GitHub Pages (static frontend)

Push to `main` and GitHub Actions automatically builds and deploys the frontend to GitHub Pages. See `.github/workflows/deploy-pages.yml`.

The static site works without a backend. To connect it to a remote API, rebuild with `VITE_API_URL` set:

```bash
VITE_API_URL=https://your-api.example.com/api npm run build:frontend
```

### Docker / Kubernetes

Tag a release to trigger the Docker build workflow (`.github/workflows/docker-build.yml`), which pushes to GHCR:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Kubernetes manifests are in `k8s/`. Update `configmap.yml` and `secret.yml` with your values, then apply:

```bash
kubectl apply -f k8s/
```

The deployment uses a `Recreate` strategy (single replica) since SQLite doesn't support concurrent writers.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, frappe-gantt
- **Backend**: Express 5, TypeScript, SQLite, Drizzle ORM, Passport.js
- **Shared**: Zod validation schemas, shared TypeScript types
- **Infra**: Docker, Kubernetes, GitHub Actions

## License

ISC
