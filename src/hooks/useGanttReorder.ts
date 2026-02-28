import { useEffect, useRef } from 'react'
import type { RefObject, MutableRefObject } from 'react'
import type Gantt from 'frappe-gantt'
import type { Task } from '../types'
import { reorderTasks } from '../utils/transformTasks'

interface UseGanttReorderOptions {
  containerRef: RefObject<HTMLDivElement | null>
  ganttRef: MutableRefObject<Gantt | null>
  tasks: Task[]
  onReorder: (tasks: Task[]) => void
}

const DRAG_THRESHOLD = 8

export function useGanttReorder({ containerRef, ganttRef, tasks, onReorder }: UseGanttReorderOptions) {
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks
  const onReorderRef = useRef(onReorder)
  onReorderRef.current = onReorder

  useEffect(() => {
    const container = containerRef.current!
    if (!container) return

    let pending = false
    let reordering = false
    let startX = 0
    let startY = 0
    let dragBarWrapper: SVGGElement | null = null
    let dragTaskId: string | null = null
    let fromIndex = -1
    let currentToIndex = -1
    let indicator: SVGLineElement | null = null
    let barRowCenters: { id: string; centerY: number; index: number }[] = []

    function getBarWrapper(target: EventTarget | null): SVGGElement | null {
      if (!(target instanceof Element)) return null
      return target.closest('.bar-wrapper') as SVGGElement | null
    }

    function getTaskIdFromWrapper(wrapper: SVGGElement): string | null {
      return wrapper.getAttribute('data-id')
    }

    /** Snapshot the center-Y (viewport-relative) of every bar-wrapper row. */
    function captureBarPositions() {
      barRowCenters = []
      const wrappers = container.querySelectorAll<SVGGElement>('.bar-wrapper')
      wrappers.forEach((wrapper) => {
        const id = wrapper.getAttribute('data-id')
        if (!id || id === dragTaskId) return
        const rect = wrapper.getBoundingClientRect()
        const centerY = rect.top + rect.height / 2
        const index = tasksRef.current.findIndex((t) => t.id === id)
        if (index !== -1) barRowCenters.push({ id, centerY, index })
      })
      // Also add the dragged bar's ORIGINAL center for reference
      if (dragBarWrapper && dragTaskId) {
        const rect = dragBarWrapper.getBoundingClientRect()
        barRowCenters.push({ id: dragTaskId, centerY: rect.top + rect.height / 2, index: fromIndex })
      }
      barRowCenters.sort((a, b) => a.centerY - b.centerY)
    }

    /** Given a viewport Y, find the closest row index. */
    function getTargetRowIndex(clientY: number): number {
      if (barRowCenters.length === 0) return fromIndex
      let closest = barRowCenters[0]
      let closestDist = Math.abs(clientY - closest.centerY)
      for (let i = 1; i < barRowCenters.length; i++) {
        const dist = Math.abs(clientY - barRowCenters[i].centerY)
        if (dist < closestDist) {
          closestDist = dist
          closest = barRowCenters[i]
        }
      }
      return closest.index
    }

    function getSvg(): SVGSVGElement | null {
      return container.querySelector('svg.gantt')
    }

    function createIndicator(): SVGLineElement | null {
      const svg = getSvg()
      if (!svg) return null
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.classList.add('reorder-indicator')
      line.setAttribute('stroke', '#3b82f6')
      line.setAttribute('stroke-width', '2')
      line.setAttribute('stroke-dasharray', '6 3')
      line.setAttribute('x1', '0')
      line.setAttribute('x2', String(svg.getBBox().width || svg.clientWidth))
      svg.appendChild(line)
      return line
    }

    function updateIndicator(toIndex: number) {
      if (!indicator) return
      // Position indicator at the target bar-wrapper's row boundary
      const target = barRowCenters.find((r) => r.index === toIndex)
      if (!target) return
      const svg = getSvg()
      if (!svg) return
      const svgRect = svg.getBoundingClientRect()
      // Convert viewport Y to SVG Y
      const svgY = target.centerY - svgRect.top
      const gantt = ganttRef.current
      const barHeight = gantt?.options.bar_height ?? 30
      const padding = gantt?.options.padding ?? 18

      let y: number
      if (toIndex > fromIndex) {
        y = svgY + barHeight / 2 + padding / 2
      } else {
        y = svgY - barHeight / 2 - padding / 2
      }
      indicator.setAttribute('y1', String(y))
      indicator.setAttribute('y2', String(y))
    }

    function cleanup() {
      if (dragBarWrapper) {
        dragBarWrapper.classList.remove('dragging')
        dragBarWrapper.removeAttribute('transform')
      }
      if (indicator) {
        indicator.remove()
        indicator = null
      }
      const ganttContainer = container.querySelector('.gantt-container')
      if (ganttContainer) ganttContainer.classList.remove('reordering')
      pending = false
      reordering = false
      dragBarWrapper = null
      dragTaskId = null
      fromIndex = -1
      currentToIndex = -1
      barRowCenters = []
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return
      const wrapper = getBarWrapper(e.target)
      if (!wrapper) return

      const taskId = getTaskIdFromWrapper(wrapper)
      if (!taskId) return

      const idx = tasksRef.current.findIndex((t) => t.id === taskId)
      if (idx === -1) return

      pending = true
      startX = e.clientX
      startY = e.clientY
      dragBarWrapper = wrapper
      dragTaskId = taskId
      fromIndex = idx
      currentToIndex = idx
    }

    function onMouseMove(e: MouseEvent) {
      if (!pending && !reordering) return

      const dx = e.clientX - startX
      const dy = e.clientY - startY

      if (pending && !reordering) {
        if (Math.abs(dy) > DRAG_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
          reordering = true
          pending = false
          e.stopImmediatePropagation()
          e.preventDefault()

          // Snapshot bar positions before we start translating the dragged bar
          captureBarPositions()

          dragBarWrapper!.classList.add('dragging')
          const ganttContainer = container.querySelector('.gantt-container')
          if (ganttContainer) ganttContainer.classList.add('reordering')
          indicator = createIndicator()
        } else if (Math.abs(dx) > DRAG_THRESHOLD) {
          pending = false
          return
        }
        return
      }

      if (reordering) {
        e.stopImmediatePropagation()
        e.preventDefault()

        if (!dragBarWrapper) return

        // Move bar visually via translate on the group element
        dragBarWrapper.setAttribute('transform', `translate(0, ${dy})`)

        // Find closest row to mouse position
        const toIndex = getTargetRowIndex(e.clientY)
        if (toIndex !== currentToIndex) {
          currentToIndex = toIndex
          updateIndicator(toIndex)
        }
      }
    }

    function commitOrCancel() {
      const wasReordering = reordering
      if (reordering && fromIndex !== currentToIndex && dragTaskId) {
        const newTasks = reorderTasks(tasksRef.current, fromIndex, currentToIndex)
        cleanup()
        onReorderRef.current(newTasks)
      } else {
        cleanup()
      }
      return wasReordering
    }

    function onMouseUp(e: MouseEvent) {
      if (!pending && !reordering) return
      e.preventDefault()
      commitOrCancel()
    }

    function cancelDrag() {
      if (!pending && !reordering) return
      const wasReordering = reordering
      cleanup()
      if (wasReordering) {
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      }
    }

    function onMouseLeave() {
      cancelDrag()
    }

    function onWindowBlur() {
      cancelDrag()
    }

    container.addEventListener('mousedown', onMouseDown, true)
    container.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('mousemove', onMouseMove, true)
    document.addEventListener('mouseup', onMouseUp, true)
    window.addEventListener('blur', onWindowBlur)

    return () => {
      container.removeEventListener('mousedown', onMouseDown, true)
      container.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('mousemove', onMouseMove, true)
      document.removeEventListener('mouseup', onMouseUp, true)
      window.removeEventListener('blur', onWindowBlur)
      cleanup()
    }
  }, [containerRef, ganttRef])
}
