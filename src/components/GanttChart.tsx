import { forwardRef, useEffect, useRef } from 'react'
import Gantt from 'frappe-gantt'
import type { FrappeTask } from 'frappe-gantt'
import type { Task } from '../types'
import { transformToFrappeTasks } from '../utils/transformTasks'

interface GanttChartProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTaskDateChange: (taskId: string, start: Date, end: Date) => void
  onReady: () => void
}

export const GanttChart = forwardRef<HTMLDivElement, GanttChartProps>(
  ({ tasks, onTaskClick, onTaskDateChange, onReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const ganttRef = useRef<Gantt | null>(null)
    const lastDateChangeRef = useRef<number>(0)

    // Store callbacks in refs to avoid re-creating Gantt on callback changes
    const onTaskClickRef = useRef(onTaskClick)
    onTaskClickRef.current = onTaskClick
    const onTaskDateChangeRef = useRef(onTaskDateChange)
    onTaskDateChangeRef.current = onTaskDateChange
    const onReadyRef = useRef(onReady)
    onReadyRef.current = onReady

    // Store tasks ref for lookup by id in click handler
    const tasksRef = useRef(tasks)
    tasksRef.current = tasks

    useEffect(() => {
      if (!containerRef.current || tasks.length === 0) {
        ganttRef.current = null
        return
      }

      const frappeTasks = transformToFrappeTasks(tasks)

      if (ganttRef.current) {
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

      onReadyRef.current()
    }, [tasks])

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
