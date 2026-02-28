import { forwardRef, useEffect, useRef } from 'react'
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

      // Re-render with the overridden date bounds applied
      if (hasDateBounds) {
        ganttRef.current.change_view_mode()
      }

      onReadyRef.current()
    }, [tasks, chartStartDate, chartEndDate])

    if (tasks.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
          No tasks yet. Add a task to see the Gantt chart.
        </div>
      )
    }

    return (
      <div ref={ref}>
        <div ref={containerRef} />
      </div>
    )
  }
)

GanttChart.displayName = 'GanttChart'
