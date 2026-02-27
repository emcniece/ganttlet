import { forwardRef } from 'react'
import { Chart } from 'react-google-charts'
import type { Task } from '../types'
import { transformTasks } from '../utils/transformTasks'

interface GanttChartProps {
  tasks: Task[]
  onReady: () => void
}

export const GanttChart = forwardRef<HTMLDivElement, GanttChartProps>(
  ({ tasks, onReady }, ref) => {
    if (tasks.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
          No tasks yet. Add a task to see the Gantt chart.
        </div>
      )
    }

    const data = transformTasks(tasks)
    const height = tasks.length * 42 + 50

    return (
      <div ref={ref}>
        <Chart
          chartType="Gantt"
          width="100%"
          height={`${height}px`}
          data={data}
          options={{
            gantt: {
              criticalPathEnabled: true,
              criticalPathStyle: {
                stroke: '#e64a19',
                strokeWidth: 2,
              },
              trackHeight: 30,
            },
          }}
          chartEvents={[
            {
              eventName: 'ready',
              callback: onReady,
            },
          ]}
        />
      </div>
    )
  }
)

GanttChart.displayName = 'GanttChart'
