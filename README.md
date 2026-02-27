# Ganttlet

[![CI](https://github.com/emcniece/ganttlet/actions/workflows/ci.yml/badge.svg)](https://github.com/emcniece/ganttlet/actions/workflows/ci.yml)
[![Deploy](https://github.com/emcniece/ganttlet/actions/workflows/deploy.yml/badge.svg)](https://github.com/emcniece/ganttlet/actions/workflows/deploy.yml)

A free, static Gantt chart tool. No signups, no backend — just open it and start planning.

**[Try it live](https://emcniece.github.io/ganttlet/)**

## Features

- **Interactive Gantt chart** powered by frappe-gantt — drag to move, resize to adjust, click to edit
- **Task management** — add, edit, and delete tasks with a form-based UI
- **Dependencies** — link tasks together with dependency arrows
- **Persistent** — tasks save to localStorage automatically
- **JSON import/export** — save your project to a file, load it back anytime
- **PNG export** — download a high-resolution image of your chart
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
- html-to-image (PNG export)

## License

ISC
