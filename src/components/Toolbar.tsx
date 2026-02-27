import { useRef, useState } from 'react'
import type { Task } from '../types'
import { exportJSON, importJSON } from '../utils/fileIO'
import { exportPNG } from '../utils/exportPNG'
import { getAccessToken } from '../utils/googleAuth'
import { exportToGoogleSheets } from '../utils/googleSheets'

interface ToolbarProps {
  tasks: Task[]
  onImport: (tasks: Task[]) => void
  chartRef: React.RefObject<HTMLDivElement | null>
  chartReady: boolean
  googleClientId: string
  onOpenSettings: () => void
}

export function Toolbar({ tasks, onImport, chartRef, chartReady, googleClientId, onOpenSettings }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)

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

  const handleExportSheets = async () => {
    if (!googleClientId) {
      onOpenSettings()
      return
    }

    setExporting(true)
    try {
      const token = await getAccessToken(googleClientId)
      const url = await exportToGoogleSheets(tasks, token)
      window.open(url, '_blank')
    } catch (err) {
      alert(`Export to Google Sheets failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setExporting(false)
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
      <button
        onClick={handleExportSheets}
        disabled={exporting || tasks.length === 0}
        className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {exporting ? 'Exporting...' : 'Export to Sheets'}
      </button>
      <button
        onClick={onOpenSettings}
        className="px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
        title="Settings"
      >
        ⚙
      </button>
    </div>
  )
}
