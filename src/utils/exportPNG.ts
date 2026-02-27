import { toPng } from 'html-to-image'

export async function exportPNG(element: HTMLElement): Promise<void> {
  const dataUrl = await toPng(element, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
  })
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = 'ganttlet.png'
  a.click()
}
