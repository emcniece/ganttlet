# Ganttlet

[![CI](https://github.com/emcniece/ganttlet/actions/workflows/ci.yml/badge.svg)](https://github.com/emcniece/ganttlet/actions/workflows/ci.yml)
[![Deploy](https://github.com/emcniece/ganttlet/actions/workflows/deploy.yml/badge.svg)](https://github.com/emcniece/ganttlet/actions/workflows/deploy.yml)

A free, static Gantt chart tool. No signups, no backend — just open it and start planning.

**[Try it live](https://emcniece.github.io/ganttlet/)**

## Features

- **Interactive Gantt chart** powered by frappe-gantt — drag to move, resize to adjust, click to edit
- **Multiple view modes** — switch between Day, Week, Month, and Year views
- **Task management** — add, edit, and delete tasks with a form-based UI
- **Task colors** — assign colors to tasks for visual grouping
- **Dependencies** — link tasks together with dependency arrows; interactive endpoint handles for linking/unlinking
- **Drag-to-reorder** — vertically drag chart bars or table rows to reorder tasks
- **Undo/redo** — Ctrl+Z / Ctrl+Shift+Z to undo and redo task mutations
- **Chart date range** — optionally set start/end dates in Settings to constrain the visible timeline
- **Tabbed settings** — General tab for chart options, OAuth tab for Google Sheets configuration
- **Persistent** — tasks and settings save to localStorage automatically
- **JSON import/export** — save your project to a file, load it back anytime
- **PNG export** — download a cropped, high-resolution image with date headers
- **Google Sheets export** — push tasks to a Google Sheet via OAuth
- **Privacy Policy & Terms of Service** — accessible via footer links or direct URL (`#/privacy`, `#/terms`)
- **Fully static** — deploy anywhere (GitHub Pages, S3, Netlify, etc.)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173/ganttlet/](http://localhost:5173/ganttlet/) in your browser.

## Build

```bash
npm run build
```

Output is in `dist/`. Preview the production build with `npm run preview`.

## Testing

```bash
npm test            # single run (used in CI)
npm run test:watch  # watch mode for development
```

## Deployment

Push to `main` and GitHub Actions will automatically build and deploy to GitHub Pages. See `.github/workflows/deploy.yml`.

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- frappe-gantt (interactive drag/resize/click)
- Canvas API (PNG export via SVG serialization)

## License

ISC
