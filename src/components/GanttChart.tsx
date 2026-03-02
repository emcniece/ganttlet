import { forwardRef, useEffect, useRef, useState } from 'react'
import Gantt from 'frappe-gantt'
import type { FrappeTask } from 'frappe-gantt'
import type { Task } from '../types'
import { transformToFrappeTasks } from '../utils/transformTasks'
import { useGanttReorder } from '../hooks/useGanttReorder'
import { useGanttDependencyLink } from '../hooks/useGanttDependencyLink'

interface GanttChartProps {
  tasks: Task[]
  chartStartDate?: string
  chartEndDate?: string
  onTaskClick: (task: Task) => void
  onTaskDateChange: (taskId: string, start: Date, end: Date) => void
  onTaskReorder?: (tasks: Task[]) => void
  onDependencyAdd?: (fromTaskId: string, toTaskId: string) => void
  onDependencyRemove?: (fromTaskId: string, toTaskId: string) => void
  onReady: () => void
}

// Fixed calculate_path for frappe-gantt Arrow class.
// Upstream bug: in the simple-path branch, the arc dy is always +curve,
// which produces a kink when the arrow points upward. Fix: negate dy
// when from_task is below to_task.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fixedArrowCalculatePath(this: any) {
  let start_x =
    this.from_task.$bar.getX() + this.from_task.$bar.getWidth() / 2

  const condition = () =>
    this.to_task.$bar.getX() < start_x + this.gantt.options.padding &&
    start_x > this.from_task.$bar.getX() + this.gantt.options.padding

  while (condition()) {
    start_x -= 10
  }
  start_x -= 10

  const start_y =
    this.gantt.config.header_height +
    this.gantt.options.bar_height +
    (this.gantt.options.padding + this.gantt.options.bar_height) *
      this.from_task.task._index +
    this.gantt.options.padding / 2

  const end_x = this.to_task.$bar.getX() - 13
  const end_y =
    this.gantt.config.header_height +
    this.gantt.options.bar_height / 2 +
    (this.gantt.options.padding + this.gantt.options.bar_height) *
      this.to_task.task._index +
    this.gantt.options.padding / 2

  const from_is_below_to =
    this.from_task.task._index > this.to_task.task._index

  let curve = this.gantt.options.arrow_curve
  const clockwise = from_is_below_to ? 1 : 0
  let curve_y = from_is_below_to ? -curve : curve

  if (
    this.to_task.$bar.getX() <=
    this.from_task.$bar.getX() + this.gantt.options.padding
  ) {
    let down_1 = this.gantt.options.padding / 2 - curve
    if (down_1 < 0) {
      down_1 = 0
      curve = this.gantt.options.padding / 2
      curve_y = from_is_below_to ? -curve : curve
    }
    const down_2 =
      this.to_task.$bar.getY() +
      this.to_task.$bar.getHeight() / 2 -
      curve_y
    const left = this.to_task.$bar.getX() - this.gantt.options.padding
    this.path = `
      M ${start_x} ${start_y}
      v ${down_1}
      a ${curve} ${curve} 0 0 1 ${-curve} ${curve}
      H ${left}
      a ${curve} ${curve} 0 0 ${clockwise} ${-curve} ${curve_y}
      V ${down_2}
      a ${curve} ${curve} 0 0 ${clockwise} ${curve} ${curve_y}
      L ${end_x} ${end_y}
      m -5 -5
      l 5 5
      l -5 5`
  } else {
    if (end_x < start_x + curve) curve = end_x - start_x

    const arc_dy = from_is_below_to ? -curve : curve // FIX: was always +curve
    const offset = from_is_below_to ? end_y + curve : end_y - curve

    this.path = `
      M ${start_x} ${start_y}
      V ${offset}
      a ${curve} ${curve} 0 0 ${clockwise} ${curve} ${arc_dy}
      L ${end_x} ${end_y}
      m -5 -5
      l 5 5
      l -5 5`
  }
}

export const GanttChart = forwardRef<HTMLDivElement, GanttChartProps>(
  ({ tasks, chartStartDate, chartEndDate, onTaskClick, onTaskDateChange, onTaskReorder, onDependencyAdd, onDependencyRemove, onReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const ganttRef = useRef<Gantt | null>(null)
    const lastDateChangeRef = useRef<number>(0)

    // Store callbacks in refs to avoid re-creating Gantt on callback changes
    const onTaskClickRef = useRef(onTaskClick)
    onTaskClickRef.current = onTaskClick
    const onTaskDateChangeRef = useRef(onTaskDateChange)
    onTaskDateChangeRef.current = onTaskDateChange
    const onTaskReorderRef = useRef(onTaskReorder)
    onTaskReorderRef.current = onTaskReorder
    const onDependencyAddRef = useRef(onDependencyAdd)
    onDependencyAddRef.current = onDependencyAdd
    const onDependencyRemoveRef = useRef(onDependencyRemove)
    onDependencyRemoveRef.current = onDependencyRemove
    const onReadyRef = useRef(onReady)
    onReadyRef.current = onReady

    // Store tasks ref for lookup by id in click handler
    const tasksRef = useRef(tasks)
    tasksRef.current = tasks

    // Refs for date bounds so the monkey-patch closure always has current values
    const chartStartDateRef = useRef(chartStartDate)
    chartStartDateRef.current = chartStartDate
    const chartEndDateRef = useRef(chartEndDate)
    chartEndDateRef.current = chartEndDate

    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [headerHeight, setHeaderHeight] = useState(50)
    const sidebarBodyRef = useRef<HTMLDivElement>(null)

    useGanttReorder({
      containerRef,
      ganttRef,
      tasks,
      onReorder: (reordered) => onTaskReorderRef.current?.(reordered),
    })

    useGanttDependencyLink({
      containerRef,
      ganttRef,
      tasks,
      onDependencyAdd: (from, to) => onDependencyAddRef.current?.(from, to),
      onDependencyRemove: (from, to) => onDependencyRemoveRef.current?.(from, to),
    })

    useEffect(() => {
      if (!containerRef.current || tasks.length === 0) {
        ganttRef.current = null
        return
      }

      const frappeTasks = transformToFrappeTasks(tasks)
      const hasDateBounds = !!chartStartDate || !!chartEndDate

      if (ganttRef.current) {
        // Update infinite_padding dynamically based on current date bounds
        ganttRef.current.options.infinite_padding = !hasDateBounds
        ganttRef.current.refresh(frappeTasks)
        return
      }

      // Clear container before creating new instance
      containerRef.current.innerHTML = ''

      ganttRef.current = new Gantt(containerRef.current, frappeTasks, {
        view_mode: 'Day',
        scroll_to: 'start',
        popup: false,
        readonly_progress: true,
        today_button: true,
        view_mode_select: true,
        infinite_padding: !hasDateBounds,
        on_click: (frappeTask: FrappeTask) => {
          // Suppress click that fires right after a drag/resize
          if (Date.now() - lastDateChangeRef.current < 500) return

          const task = tasksRef.current.find((t) => t.id === frappeTask.id)
          if (task) onTaskClickRef.current(task)
        },
        on_date_change: (frappeTask: FrappeTask, start: Date, end: Date) => {
          lastDateChangeRef.current = Date.now()
          onTaskDateChangeRef.current(frappeTask.id, start, end)
        },
      })

      // Monkey-patch setup_gantt_dates so date-bound overrides survive
      // every refresh/view-mode change automatically
      const origSetupGanttDates = ganttRef.current.setup_gantt_dates.bind(ganttRef.current)
      ganttRef.current.setup_gantt_dates = function (refresh: boolean) {
        origSetupGanttDates(refresh)
        const startStr = chartStartDateRef.current
        const endStr = chartEndDateRef.current
        if (startStr) {
          const d = new Date(startStr + 'T00:00:00')
          if (!isNaN(d.getTime())) {
            this.gantt_start = d
          }
        }
        if (endStr) {
          const d = new Date(endStr + 'T00:00:00')
          if (!isNaN(d.getTime())) {
            this.gantt_end = d
          }
        }
      }

      // Patch Arrow.calculate_path to fix upward arrow kink.
      // Access the Arrow prototype via make_arrows, then replace calculate_path
      // with the fixed version and re-update all arrow paths.
      const origMakeArrows = ganttRef.current.make_arrows.bind(ganttRef.current)
      ganttRef.current.make_arrows = function () {
        origMakeArrows()
        for (const arrow of this.arrows) {
          arrow.calculate_path = fixedArrowCalculatePath
          arrow.update()
        }
      }

      // Re-render with the overridden date bounds applied
      if (hasDateBounds) {
        ganttRef.current.change_view_mode()
      }

      onReadyRef.current()
    }, [tasks, chartStartDate, chartEndDate])

    // Measure gantt header height and sync sidebar scroll
    useEffect(() => {
      if (!containerRef.current || !ganttRef.current) return

      const ganttContainer = containerRef.current.querySelector('.gantt-container') as HTMLElement
      if (!ganttContainer) return

      const gridHeader = ganttContainer.querySelector('.grid-header') as HTMLElement
      if (!gridHeader) return

      setHeaderHeight(gridHeader.offsetHeight)
      const observer = new ResizeObserver(() => setHeaderHeight(gridHeader.offsetHeight))
      observer.observe(gridHeader)

      const syncScroll = () => {
        if (sidebarBodyRef.current) {
          sidebarBodyRef.current.scrollTop = ganttContainer.scrollTop
        }
      }
      ganttContainer.addEventListener('scroll', syncScroll)

      return () => {
        observer.disconnect()
        ganttContainer.removeEventListener('scroll', syncScroll)
      }
    }, [tasks, chartStartDate, chartEndDate])

    if (tasks.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
          No tasks yet. Add a task to see the Gantt chart.
        </div>
      )
    }

    const rowHeight = ganttRef.current?.options
      ? ganttRef.current.options.bar_height + ganttRef.current.options.padding
      : 48
    return (
      <div ref={ref}>
        <div className="flex">
          <div
            className="flex-shrink-0 flex flex-col border-r border-gray-200 bg-white overflow-hidden transition-[width] duration-200"
            style={{ width: sidebarOpen ? 180 : 24 }}
          >
            <div
              className="flex items-end px-1 pb-1 flex-shrink-0"
              style={{ height: headerHeight }}
            >
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                title={sidebarOpen ? 'Collapse task list' : 'Show task list'}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={sidebarOpen ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
                  />
                </svg>
              </button>
              {sidebarOpen && (
                <span className="ml-1 text-xs font-semibold text-gray-500 whitespace-nowrap">Tasks</span>
              )}
            </div>
            <div ref={sidebarBodyRef} className="flex-1 overflow-hidden">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="truncate px-2 text-xs text-gray-700 border-b border-gray-200"
                  style={{ height: rowHeight, lineHeight: `${rowHeight}px` }}
                >
                  {sidebarOpen && task.name}
                </div>
              ))}
            </div>
          </div>
          <div ref={containerRef} className="flex-1 min-w-0" />
        </div>
      </div>
    )
  }
)

GanttChart.displayName = 'GanttChart'
