# Ganttlet

## Context

No good free Gantt chart tools exist online. This is a static React app that renders an interactive Gantt chart with drag-to-move, resize, click-to-edit, and dependency arrows, with form-based task management, hosted on GitHub Pages. No backend or authentication needed.

## Tech Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4** (with `@tailwindcss/vite` plugin)
- **frappe-gantt** v1.2.2 (vanilla JS, MIT, drag/resize/click/dependency arrows)
- **html-to-image** (PNG export — frappe-gantt renders inline SVG, captured cleanly)
- **uuid** (task ID generation)

## File Structure

```
ganttlet/
  .github/workflows/deploy.yml
  src/
    components/
      GanttChart.tsx       # Imperative React wrapper around frappe-gantt
      TaskForm.tsx          # Add/edit modal form
      TaskTable.tsx         # Task list with edit/delete buttons
      Toolbar.tsx           # Import/Export JSON + Export PNG buttons
    hooks/
      useLocalStorage.ts    # Generic localStorage sync hook
    types/
      frappe-gantt.d.ts     # Custom TypeScript declarations for frappe-gantt
    utils/
      transformTasks.ts     # Task[] → FrappeTask[] + reverse date helper
      fileIO.ts             # JSON import/export helpers
      exportPNG.ts          # html-to-image PNG download
    types.ts                # Task, AppData interfaces
    App.tsx                 # Root: state, CRUD, layout, drag-date handling
    main.tsx                # Vite entry
    index.css               # Tailwind + frappe-gantt CSS + font overrides
  vite.config.ts            # React + Tailwind plugins, base: '/ganttlet/'
```

## Implementation Steps

### Step 1: Scaffold project
- `npm create vite@latest ganttlet -- --template react-ts`
- Install deps: `frappe-gantt`, `html-to-image`, `uuid`, `@types/uuid`, `tailwindcss`, `@tailwindcss/vite`
- Configure `vite.config.ts` (React plugin, Tailwind plugin, `base: '/ganttlet/'`)
- Replace `src/index.css` with `@import "tailwindcss"`
- Verify `npm run dev` works

### Step 2: Create types (`src/types.ts`)
- `Task` interface: id, name, resource, start (ISO string), end (ISO string), duration (ms | null), percentComplete (0-100), dependencies (string[])
- `AppData` interface with version field for JSON import/export

### Step 3: Create `useLocalStorage` hook
- useState initialized from localStorage, useEffect to persist on change

### Step 4: Create `transformTasks` utility
- `transformToFrappeTasks(tasks)` — maps Task[] to FrappeTask[] (percentComplete → progress, dependencies[] → comma-separated string)
- `applyDateChange(task, newStart, newEnd)` — formats Dates back to ISO strings for state updates

### Step 5: Create `GanttChart` component
- Renders a `<div>` container with ref
- Instantiates `new Gantt(element, tasks, options)` on mount
- Calls `gantt.refresh(tasks)` when tasks change
- `on_click` → opens edit form (with 500ms click-after-drag suppression via timestamp ref)
- `on_date_change` → updates task dates in App state
- `popup: false` (we use our own TaskForm modal)
- `readonly_progress: true` (progress editing stays in form)
- Stores callbacks in refs to avoid re-creating Gantt instance on every render
- Forwards outer ref for PNG export

### Step 6: Create `App.tsx` with state + GanttChart
- `useLocalStorage<Task[]>('gantt-tasks', sampleTasks)` for task persistence
- `editingTask` and `isFormOpen` state for form control
- CRUD handlers: add (with uuid), edit (map replace), delete (filter + clean deps)
- `handleTaskDateChange(taskId, start, end)` — uses `applyDateChange` for drag/resize updates
- Render layout: header/toolbar → chart → task table

### Step 7: Create `TaskTable` component
- Table with columns: Name, Resource, Start, End, % Complete, Dependencies, Actions
- Edit and Delete buttons per row

### Step 8: Create `TaskForm` component (most complex)
- Fields: name, resource, start date, end date, duration (in days, converted to ms), % complete (slider/number), dependencies (multi-select from other tasks)
- Validation: at minimum start+end OR end+duration required
- Duration input in days (user-friendly), stored as milliseconds
- If start+end both provided, duration set to null to avoid conflicts

### Step 9: Create `Toolbar` + `fileIO.ts` (JSON import/export)
- Export: serialize `{ version: 1, tasks }` → Blob → download as `ganttlet.json`
- Import: hidden `<input type="file" accept=".json">`, FileReader, validate structure, parse tasks

### Step 10: Create `exportPNG.ts` + wire to Toolbar
- `toPng(element, { backgroundColor: '#fff', pixelRatio: 2 })` from html-to-image
- Only enabled after chart `ready` event fires
- PNG export works well — frappe-gantt renders inline SVG (no iframe), so html-to-image captures it cleanly

### Step 11: Create GitHub Actions workflow (`.github/workflows/deploy.yml`)
- Trigger on push to `main`
- Node 20, npm ci, npm run build, deploy `./dist` to Pages
- Uses `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`

### Step 12: Create frappe-gantt type declarations (`src/types/frappe-gantt.d.ts`)
- `FrappeTask` interface, `GanttOptions` interface, `Gantt` class
- Covers constructor, `refresh()`, `change_view_mode()`

### Step 13: CSS setup (`src/index.css`)
- Import frappe-gantt CSS via relative path (bypasses strict `exports` field)
- Font overrides for `.gantt .bar-label`, `.gantt .lower-text`, `.gantt .upper-text` with Tailwind's default sans-serif stack

## Key Gotchas
- **Click after drag**: frappe-gantt fires `on_click` after a drag. Suppressed by tracking `on_date_change` timestamp and ignoring clicks within 500ms.
- **CSS import**: frappe-gantt's `exports` field blocks sub-path imports. Use relative path `../node_modules/frappe-gantt/dist/frappe-gantt.css` to bypass.
- **Empty data**: Guard with `tasks.length === 0` check before creating Gantt instance.
- **Timezone dates**: `new Date('2025-03-15')` = UTC midnight, causes off-by-one. Parse as `new Date(y, m-1, d)` instead.
- **Duration units**: TaskForm inputs days → stored as milliseconds (`× 86400000`).
- **PNG export**: Works cleanly — frappe-gantt renders inline SVG (no iframe like Google Charts).
- **GitHub Pages base path**: `vite.config.ts` `base` must match repo name exactly.

## Verification
1. `npm run dev` — app loads, chart renders with sample tasks
2. Click a bar → TaskForm opens in edit mode for that task
3. Drag a bar left/right → task start/end dates shift, table updates
4. Resize a bar from either edge → start or end date changes, table updates
5. Dependency arrows render between linked tasks
6. Add task via form → appears in chart and table, persists after refresh (localStorage)
7. Delete task → removed from chart and from other tasks' dependencies
8. Export JSON → valid file downloads, re-import restores state
9. Export PNG → downloads a crisp 2x resolution image of the chart
10. Fonts in chart match the rest of the page (sans-serif)
11. `npm run build` → no errors, `dist/` contains static files
12. Push to GitHub → Actions workflow deploys to Pages successfully
