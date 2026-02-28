import { useEffect, useRef } from 'react'
import type { RefObject, MutableRefObject } from 'react'
import type Gantt from 'frappe-gantt'
import type { Task } from '../types'

interface UseGanttDependencyLinkOptions {
  containerRef: RefObject<HTMLDivElement | null>
  ganttRef: MutableRefObject<Gantt | null>
  tasks: Task[]
  onDependencyAdd: (fromTaskId: string, toTaskId: string) => void
  onDependencyRemove: (fromTaskId: string, toTaskId: string) => void
}

const HANDLE_RADIUS = 6

export function useGanttDependencyLink({
  containerRef,
  ganttRef,
  tasks,
  onDependencyAdd,
  onDependencyRemove,
}: UseGanttDependencyLinkOptions) {
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks
  const onDependencyAddRef = useRef(onDependencyAdd)
  onDependencyAddRef.current = onDependencyAdd
  const onDependencyRemoveRef = useRef(onDependencyRemove)
  onDependencyRemoveRef.current = onDependencyRemove

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let linking = false
    let sourceTaskId: string | null = null
    let tempLine: SVGLineElement | null = null
    let activeHandles: SVGCircleElement[] = []
    let hoveredWrapper: SVGGElement | null = null
    let currentLinkTarget: SVGGElement | null = null

    function getSvg(): SVGSVGElement | null {
      return container!.querySelector('svg.gantt')
    }

    function getBarWrapper(target: EventTarget | null): SVGGElement | null {
      if (!(target instanceof Element)) return null
      return target.closest('.bar-wrapper') as SVGGElement | null
    }

    function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
      const rect = svg.getBoundingClientRect()
      const vb = svg.viewBox?.baseVal
      const offsetX = vb ? vb.x : 0
      const offsetY = vb ? vb.y : 0
      const scaleX = vb && vb.width ? vb.width / rect.width : 1
      const scaleY = vb && vb.height ? vb.height / rect.height : 1
      return {
        x: (clientX - rect.left) * scaleX + offsetX,
        y: (clientY - rect.top) * scaleY + offsetY,
      }
    }

    function getBarGeometry(wrapper: SVGGElement) {
      const bar = wrapper.querySelector('rect.bar') as SVGRectElement | null
      if (!bar) return null
      const x = +bar.getAttribute('x')!
      const y = +bar.getAttribute('y')!
      const w = +bar.getAttribute('width')!
      const h = +bar.getAttribute('height')!
      return { x, y, w, h }
    }

    function removeHandles() {
      activeHandles.forEach((h) => h.remove())
      activeHandles = []
    }

    function createHandle(cx: number, cy: number, wrapper: SVGGElement): SVGCircleElement {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.classList.add('dep-handle')
      circle.setAttribute('cx', String(cx))
      circle.setAttribute('cy', String(cy))
      circle.setAttribute('r', String(HANDLE_RADIUS))
      // Append inside the bar-wrapper group so :hover cascades
      wrapper.appendChild(circle)
      return circle
    }

    function showHandles(wrapper: SVGGElement) {
      removeHandles()
      const svg = getSvg()
      if (!svg) return
      const geo = getBarGeometry(wrapper)
      if (!geo) return

      const leftHandle = createHandle(geo.x, geo.y + geo.h / 2, wrapper)
      const rightHandle = createHandle(geo.x + geo.w, geo.y + geo.h / 2, wrapper)
      activeHandles = [leftHandle, rightHandle]
    }

    function onMouseOver(e: MouseEvent) {
      if (linking) return
      const wrapper = getBarWrapper(e.target)
      if (!wrapper || wrapper === hoveredWrapper) return
      hoveredWrapper = wrapper
      showHandles(wrapper)
    }

    function onMouseOut(e: MouseEvent) {
      if (linking) return
      const wrapper = getBarWrapper(e.target)
      if (!wrapper) return
      // Check if we're leaving to another child of the same wrapper
      const related = e.relatedTarget as Element | null
      if (related && wrapper.contains(related)) return
      if (wrapper === hoveredWrapper) {
        hoveredWrapper = null
        removeHandles()
      }
    }

    function onMouseDown(e: MouseEvent) {
      const target = e.target as Element
      if (!target.classList.contains('dep-handle')) return

      e.stopImmediatePropagation()
      e.preventDefault()

      const wrapper = getBarWrapper(target)
      if (!wrapper) return

      const taskId = wrapper.getAttribute('data-id')
      if (!taskId) return

      const svg = getSvg()
      if (!svg) return

      linking = true
      sourceTaskId = taskId

      // Mark the container for CSS targeting
      const ganttContainer = container!.querySelector('.gantt-container')
      if (ganttContainer) ganttContainer.classList.add('linking')
      wrapper.classList.add('link-source')

      // Create temp line from the handle center
      const cx = +target.getAttribute('cx')!
      const cy = +target.getAttribute('cy')!

      tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      tempLine.classList.add('dep-link-line')
      tempLine.setAttribute('x1', String(cx))
      tempLine.setAttribute('y1', String(cy))
      tempLine.setAttribute('x2', String(cx))
      tempLine.setAttribute('y2', String(cy))
      svg.appendChild(tempLine)
    }

    function clearLinkTarget() {
      if (currentLinkTarget) {
        currentLinkTarget.classList.remove('link-target')
        currentLinkTarget = null
      }
    }

    function onMouseMove(e: MouseEvent) {
      if (!linking || !tempLine) return

      e.stopImmediatePropagation()
      e.preventDefault()

      const svg = getSvg()
      if (!svg) return

      const pt = toSvgPoint(svg, e.clientX, e.clientY)
      tempLine.setAttribute('x2', String(pt.x))
      tempLine.setAttribute('y2', String(pt.y))

      // Track hovered target bar for active highlight
      // Use elementFromPoint — e.target may not reflect the bar under the cursor
      // because capture-phase listeners and SVG layering can interfere
      const elUnderCursor = document.elementFromPoint(e.clientX, e.clientY)
      const wrapper = getBarWrapper(elUnderCursor)
      const isValidTarget = wrapper && wrapper.getAttribute('data-id') !== sourceTaskId
      const nextTarget = isValidTarget ? wrapper : null

      if (nextTarget !== currentLinkTarget) {
        clearLinkTarget()
        if (nextTarget) {
          nextTarget.classList.add('link-target')
          currentLinkTarget = nextTarget
        }
      }
    }

    function cleanupLinking() {
      if (tempLine) {
        tempLine.remove()
        tempLine = null
      }

      const ganttContainer = container!.querySelector('.gantt-container')
      if (ganttContainer) ganttContainer.classList.remove('linking')

      const sourceWrapper = container!.querySelector('.bar-wrapper.link-source')
      if (sourceWrapper) sourceWrapper.classList.remove('link-source')

      clearLinkTarget()

      linking = false
      sourceTaskId = null
      removeHandles()
      hoveredWrapper = null
    }

    function onMouseUp(e: MouseEvent) {
      if (!linking || !sourceTaskId) return

      e.stopImmediatePropagation()
      e.preventDefault()

      const elUnderCursor = document.elementFromPoint(e.clientX, e.clientY)
      const wrapper = getBarWrapper(elUnderCursor)
      if (wrapper) {
        const targetId = wrapper.getAttribute('data-id')
        if (targetId && targetId !== sourceTaskId) {
          onDependencyAddRef.current(sourceTaskId, targetId)
        }
      }

      cleanupLinking()
    }

    /**
     * Inject invisible wider hit-area paths over each arrow for easier hovering.
     * Each hit-area clone sits on top of the visible path, catches pointer events,
     * and toggles an .arrow-hover class on the visible sibling for the red highlight.
     */
    function injectArrowHitAreas() {
      const arrowGroup = container!.querySelector('g.arrow')
      if (!arrowGroup) return

      // Clean up previous hit areas
      arrowGroup.querySelectorAll('.arrow-hit-area').forEach((el) => el.remove())

      const paths = arrowGroup.querySelectorAll<SVGPathElement>('path[data-from][data-to]')
      paths.forEach((path) => {
        // Disable pointer events on the thin visible path
        path.style.pointerEvents = 'none'

        const hit = path.cloneNode() as SVGPathElement
        hit.removeAttribute('class')
        hit.classList.add('arrow-hit-area')
        hit.style.pointerEvents = ''
        // Append after visible path so it paints on top in SVG
        path.after(hit)

        hit.addEventListener('mouseenter', () => path.classList.add('arrow-hover'))
        hit.addEventListener('mouseleave', () => path.classList.remove('arrow-hover'))
      })
    }

    function onArrowClick(e: MouseEvent) {
      const target = e.target as Element
      if (!target.closest('g.arrow')) return

      const fromId = target.getAttribute('data-from')
      const toId = target.getAttribute('data-to')
      if (fromId && toId) {
        e.stopImmediatePropagation()
        e.preventDefault()
        onDependencyRemoveRef.current(fromId, toId)
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && linking) {
        cleanupLinking()
      }
    }

    // Inject arrow hit areas after a microtask so Gantt has rendered arrows
    queueMicrotask(injectArrowHitAreas)

    // Hover handles — bubble phase on container
    container.addEventListener('mouseover', onMouseOver)
    container.addEventListener('mouseout', onMouseOut)

    // Linking interaction — capture phase
    container.addEventListener('mousedown', onMouseDown, true)
    document.addEventListener('mousemove', onMouseMove, true)
    document.addEventListener('mouseup', onMouseUp, true)

    // Arrow click for removal — bubble phase on container
    container.addEventListener('click', onArrowClick)

    // Escape to cancel
    document.addEventListener('keydown', onKeyDown)

    return () => {
      container.removeEventListener('mouseover', onMouseOver)
      container.removeEventListener('mouseout', onMouseOut)
      container.removeEventListener('mousedown', onMouseDown, true)
      document.removeEventListener('mousemove', onMouseMove, true)
      document.removeEventListener('mouseup', onMouseUp, true)
      container.removeEventListener('click', onArrowClick)
      document.removeEventListener('keydown', onKeyDown)
      cleanupLinking()
    }
  }, [containerRef, ganttRef, tasks])
}
