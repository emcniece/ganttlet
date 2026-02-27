import { useRef } from 'react'
import type { Task } from '../types'
import { exportJSON, importJSON } from '../utils/fileIO'
import { exportPNG } from '../utils/exportPNG'

interface ToolbarProps {
  tasks: Task[]
  onImport: (tasks: Task[]) => void
  chartRef: React.RefObject<HTMLDivElement | null>
  chartReady: boolean
}

export function Toolbar({ tasks, onImport, chartRef, chartReady }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await importJSON(file)
      onImport(imported)
    } catch {
      alert('Failed to import: invalid file format')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleExportPNG = async () => {
    if (!chartRef.current) return
    try {
      await exportPNG(chartRef.current)
    } catch {
      alert('Failed to export PNG. The chart may contain elements that cannot be captured.')
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => exportJSON(tasks)}
        disabled={tasks.length === 0}
        className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Export JSON
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded hover:bg-gray-800"
      >
        Import JSON
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
      <button
        onClick={handleExportPNG}
        disabled={!chartReady || tasks.length === 0}
        className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Export PNG
      </button>
    </div>
  )
}
