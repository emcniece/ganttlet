const SVG_STYLE_PROPS = [
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'visibility',
  'display',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-anchor',
  'dominant-baseline',
  'alignment-baseline',
  'color',
]

function inlineStyles(source: Element, target: Element) {
  const computed = getComputedStyle(source)
  const styles = SVG_STYLE_PROPS.map(
    (prop) => `${prop}:${computed.getPropertyValue(prop)}`
  ).join(';')
  target.setAttribute('style', styles)

  for (let i = 0; i < source.children.length; i++) {
    if (target.children[i]) {
      inlineStyles(source.children[i], target.children[i])
    }
  }
}

interface HeaderLabel {
  text: string
  x: number
  y: number
  font: string
  color: string
  align: CanvasTextAlign
}

function readHeaderLabels(
  element: HTMLElement,
  cropX: number,
  cropW: number
): { labels: HeaderLabel[]; height: number } {
  const header = element.querySelector('.grid-header') as HTMLElement | null
  if (!header) return { labels: [], height: 0 }

  const labels: HeaderLabel[] = []

  const upperTexts = header.querySelectorAll('.upper-text')
  const lowerTexts = header.querySelectorAll('.lower-text')

  const upperHeight = 25
  const lowerHeight = 20
  const headerHeight = upperHeight + lowerHeight + 8

  upperTexts.forEach((el) => {
    const htmlEl = el as HTMLElement
    const left = parseFloat(htmlEl.style.left) || 0
    if (left + htmlEl.offsetWidth < cropX || left > cropX + cropW) return
    labels.push({
      text: htmlEl.innerText,
      x: left - cropX,
      y: upperHeight,
      font: '500 14px -apple-system, system-ui, sans-serif',
      color: '#171717',
      align: 'left',
    })
  })

  lowerTexts.forEach((el) => {
    const htmlEl = el as HTMLElement
    const left = parseFloat(htmlEl.style.left) || 0
    const width = htmlEl.offsetWidth
    if (left + width < cropX || left > cropX + cropW) return
    labels.push({
      text: htmlEl.innerText,
      x: left - cropX + width / 2,
      y: upperHeight + lowerHeight + 2,
      font: '400 12px -apple-system, system-ui, sans-serif',
      color: '#7c7c7c',
      align: 'center',
    })
  })

  return { labels, height: headerHeight }
}

export async function renderChartImage(element: HTMLElement): Promise<string> {
  const svgEl = element.querySelector('svg.gantt') as SVGSVGElement
  if (!svgEl) throw new Error('Chart SVG not found')

  const barGroup = svgEl.querySelector('g.bar') as SVGGElement | null
  const fullHeight =
    svgEl.height.baseVal.value || svgEl.getBoundingClientRect().height

  // Crop to the task bars area with some padding, or fall back to full SVG
  const padding = 20
  let vx: number, vy: number, vw: number, vh: number
  if (barGroup && barGroup.children.length > 0) {
    const bbox = barGroup.getBBox()
    vx = bbox.x - padding
    vy = 0
    vw = bbox.width + padding * 2
    vh = fullHeight
  } else {
    const fullWidth =
      svgEl.width.baseVal.value || svgEl.getBoundingClientRect().width
    vx = 0
    vy = 0
    vw = fullWidth
    vh = fullHeight
  }

  // Read date header labels from the HTML overlay before cloning
  const { labels, height: headerHeight } = readHeaderLabels(element, vx, vw)

  // Clone SVG and inline all computed styles so CSS variable
  // values survive serialization outside the document.
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  inlineStyles(svgEl, clone)

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`)
  clone.setAttribute('width', String(vw))
  clone.setAttribute('height', String(vh))

  // Remove animations that are meaningless in a static image
  clone.querySelectorAll('animate').forEach((el) => el.remove())

  // Serialize SVG → Image → Canvas → PNG
  const svgString = new XMLSerializer().serializeToString(clone)
  const svgDataUrl =
    'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString)

  const pixelRatio = 2
  const totalHeight = headerHeight + vh
  const canvas = document.createElement('canvas')
  canvas.width = vw * pixelRatio
  canvas.height = totalHeight * pixelRatio
  const ctx = canvas.getContext('2d')!
  ctx.scale(pixelRatio, pixelRatio)

  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, vw, totalHeight)

  // Draw date headers
  for (const label of labels) {
    ctx.font = label.font
    ctx.fillStyle = label.color
    ctx.textAlign = label.align
    ctx.textBaseline = 'bottom'
    ctx.fillText(label.text, label.x, label.y)
  }

  // Separator line below headers
  if (headerHeight > 0) {
    ctx.strokeStyle = '#e5e5e5'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, headerHeight - 1)
    ctx.lineTo(vw, headerHeight - 1)
    ctx.stroke()
  }

  // Draw chart below headers
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = svgDataUrl
  })
  ctx.drawImage(img, 0, headerHeight, vw, vh)

  return canvas.toDataURL('image/png')
}

export async function exportPNG(element: HTMLElement): Promise<void> {
  const pngUrl = await renderChartImage(element)
  const a = document.createElement('a')
  a.href = pngUrl
  a.download = 'ganttlet.png'
  a.click()
}

export async function openChartImage(element: HTMLElement): Promise<void> {
  const pngUrl = await renderChartImage(element)
  window.open(pngUrl, '_blank')
}
