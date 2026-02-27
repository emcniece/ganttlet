# Ganttlet

## Context

No good free Gantt chart tools exist online. Google Charts API supports Gantt chart rendering, and `react-google-charts` wraps it for React. This plan builds a static React app that renders an interactive (view-only) Gantt chart with form-based task management, hosted on GitHub Pages. No backend or authentication needed.

## Tech Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4** (with `@tailwindcss/vite` plugin)
- **react-google-charts** (`chartType="Gantt"`)
- **html-to-image** (PNG export — handles SVG/HTML mix better than html2canvas)
- **uuid** (task ID generation)

## File Structure

```
ganttlet/
  .github/workflows/deploy.yml
  src/
    components/
      GanttChart.tsx       # Chart wrapper, forwardRef for PNG export
      TaskForm.tsx          # Add/edit modal form
      TaskTable.tsx         # Task list with edit/delete buttons
      Toolbar.tsx           # Import/Export JSON + Export PNG buttons
    hooks/
      useLocalStorage.ts    # Generic localStorage sync hook
    utils/
      transformTasks.ts     # Task[] → Google Charts 8-column format
      fileIO.ts             # JSON import/export helpers
      exportPNG.ts          # html-to-image PNG download
    types.ts                # Task, GanttRow, AppData interfaces
    App.tsx                 # Root: state, CRUD, layout
    main.tsx                # Vite entry
    index.css               # @import "tailwindcss"
  vite.config.ts            # React + Tailwind plugins, base: '/ganttlet/'
```

## Implementation Steps

### Step 1: Scaffold project
- `npm create vite@latest ganttlet -- --template react-ts`
- Install deps: `react-google-charts`, `html-to-image`, `uuid`, `@types/uuid`, `tailwindcss`, `@tailwindcss/vite`
- Configure `vite.config.ts` (React plugin, Tailwind plugin, `base: '/ganttlet/'`)
- Replace `src/index.css` with `@import "tailwindcss"`
- Verify `npm run dev` works

### Step 2: Create types (`src/types.ts`)
- `Task` interface: id, name, resource, start (ISO string), end (ISO string), duration (ms | null), percentComplete (0-100), dependencies (string[])
- `GanttRow` tuple type matching the 8 required columns
- `AppData` interface with version field for JSON import/export

### Step 3: Create `useLocalStorage` hook
- useState initialized from localStorage, useEffect to persist on change

### Step 4: Create `transformTasks` utility
- Converts `Task[]` → `[columns, ...rows]` for react-google-charts
- Converts ISO date strings → `Date` objects (using `new Date(year, month-1, day)` to avoid timezone issues)
- Joins dependencies array into comma-separated string

### Step 5: Create `GanttChart` component
- Wraps `<Chart chartType="Gantt">` with forwardRef (for PNG export)
- Renders empty state placeholder when no tasks
- Dynamic height: `tasks.length * 42 + 50` px
- Enables critical path by default
- Tracks `ready` event via `chartEvents` prop

### Step 6: Create `App.tsx` with state + GanttChart
- `useLocalStorage<Task[]>('gantt-tasks', [])` for task persistence
- `editingTask` and `isFormOpen` state for form control
- CRUD handlers: add (with uuid), edit (map replace), delete (filter + clean deps)
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
- Fallback note: if html-to-image fails on Google Charts SVG, switch to html2canvas

### Step 11: Create GitHub Actions workflow (`.github/workflows/deploy.yml`)
- Trigger on push to `main`
- Node 20, npm ci, npm run build, deploy `./dist` to Pages
- Uses `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`

## Key Gotchas
- **Empty data**: react-google-charts throws on empty arrays — guard with `tasks.length === 0` check
- **Timezone dates**: `new Date('2025-03-15')` = UTC midnight, causes off-by-one. Parse as `new Date(y, m-1, d)` instead
- **Duration units**: Google Charts expects **milliseconds**. User inputs days → multiply by `86400000`
- **Chart is read-only**: No drag-to-edit. All editing via TaskForm
- **PNG export timing**: Chart renders async. Disable export until `ready` event fires
- **GitHub Pages base path**: `vite.config.ts` `base` must match repo name exactly

## Verification
1. `npm run dev` — app loads, chart renders with sample/added tasks
2. Add task via form → appears in chart and table, persists after page refresh (localStorage)
3. Edit task → chart updates correctly
4. Delete task → removed from chart and from other tasks' dependencies
5. Export JSON → valid file downloads, re-import restores state
6. Export PNG → downloads a crisp 2x resolution image of the chart
7. `npm run build` → no errors, `dist/` contains static files
8. Push to GitHub → Actions workflow deploys to Pages successfully
