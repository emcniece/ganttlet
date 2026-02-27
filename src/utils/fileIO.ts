import type { Task, AppData } from '../types'

export function exportJSON(tasks: Task[]): void {
  const data: AppData = { version: 1, tasks }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ganttlet.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function importJSON(file: File): Promise<Task[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as AppData
        if (!data.version || !Array.isArray(data.tasks)) {
          throw new Error('Invalid file format')
        }
        resolve(data.tasks)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
