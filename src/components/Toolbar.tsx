import { useRef, useState, useEffect } from 'react'
import type { Task } from '../types'
import { exportJSON, importJSON } from '../utils/fileIO'
import { exportPNG, openChartImage } from '../utils/exportPNG'
import { getAccessToken } from '../utils/googleAuth'
import { exportToGoogleSheets } from '../utils/googleSheets'
import { csvToTasks } from '../utils/csvImport'

interface ToolbarProps {
  tasks: Task[]
  onImport: (tasks: Task[]) => void
  chartRef: React.RefObject<HTMLDivElement | null>
  chartReady: boolean
  googleClientId: string
  onOpenSettings: () => void
  onImportSheet: (urlOrId: string) => void
}

export function Toolbar({ tasks, onImport, chartRef, chartReady, googleClientId, onOpenSettings, onImportSheet }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [open, setOpen] = useState(false)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

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
    setOpen(false)
    try {
      await exportPNG(chartRef.current)
    } catch {
      alert('Failed to export PNG. The chart may contain elements that cannot be captured.')
    }
  }

  const handleOpenImage = async () => {
    if (!chartRef.current) return
    setOpen(false)
    try {
      await openChartImage(chartRef.current)
    } catch {
      alert('Failed to generate chart image.')
    }
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const imported = csvToTasks(text)
      if (imported.length === 0) {
        alert('No tasks found in CSV file')
        return
      }
      onImport(imported)
    } catch (err) {
      alert(`Failed to import CSV: ${err instanceof Error ? err.message : String(err)}`)
    }
    if (csvInputRef.current) csvInputRef.current.value = ''
  }

  const handleImportSheet = () => {
    setOpen(false)
    const input = window.prompt('Enter Google Sheet URL or ID:\n\n(The sheet must be published via File > Share > Publish to web)')
    if (!input?.trim()) return
    onImportSheet(input.trim())
  }

  const handleExportSheets = async () => {
    setOpen(false)
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

  const itemClass = (disabled?: boolean) =>
    `w-full text-left px-3 py-1.5 text-sm ${
      disabled
        ? 'text-gray-400 cursor-not-allowed'
        : 'text-gray-700 hover:bg-gray-100'
    }`

  return (
    <div className="flex flex-wrap gap-2">
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded hover:bg-gray-800 flex items-center gap-1"
        >
          {exporting ? 'Exporting...' : 'Export / Import'}
          <svg className="w-3 h-3 ml-0.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5l3 3 3-3" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
            <button
              onClick={() => { exportJSON(tasks); setOpen(false) }}
              disabled={tasks.length === 0}
              className={itemClass(tasks.length === 0)}
            >
              Export JSON
            </button>
            <button
              onClick={() => { fileInputRef.current?.click(); setOpen(false) }}
              className={itemClass()}
            >
              Import JSON
            </button>
            <hr className="my-1 border-gray-200" />
            <button
              onClick={handleExportPNG}
              disabled={!chartReady || tasks.length === 0}
              className={itemClass(!chartReady || tasks.length === 0)}
            >
              Export PNG
            </button>
            <button
              onClick={handleOpenImage}
              disabled={!chartReady || tasks.length === 0}
              className={itemClass(!chartReady || tasks.length === 0)}
            >
              View Image
            </button>
            <hr className="my-1 border-gray-200" />
            <button
              onClick={handleExportSheets}
              disabled={exporting || tasks.length === 0}
              className={itemClass(exporting || tasks.length === 0)}
            >
              Export to Google Sheets
            </button>
            <button
              onClick={handleImportSheet}
              className={itemClass()}
            >
              Import from Google Sheet
            </button>
            <hr className="my-1 border-gray-200" />
            <button
              onClick={() => { csvInputRef.current?.click(); setOpen(false) }}
              className={itemClass()}
            >
              Import CSV
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv"
        onChange={handleImportCSV}
        className="hidden"
      />
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
