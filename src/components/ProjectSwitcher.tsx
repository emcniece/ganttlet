import { useState, useRef, useEffect } from 'react'
import type { Project } from '../types'

interface ProjectSwitcherProps {
  projects: Project[]
  activeProjectId: string
  onSwitch: (id: string) => void
  onCreate: (name: string) => string
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

export function ProjectSwitcher({
  projects,
  activeProjectId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const activeProject = projects.find((p) => p.id === activeProjectId)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setRenamingId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  const handleCreate = () => {
    const name = window.prompt('New project name:')
    if (!name?.trim()) return
    const id = onCreate(name.trim())
    onSwitch(id)
    setOpen(false)
  }

  const startRename = (project: Project) => {
    setRenamingId(project.id)
    setRenameValue(project.name)
  }

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim())
    }
    setRenamingId(null)
  }

  const handleDelete = (id: string, name: string) => {
    if (projects.length <= 1) return
    if (!window.confirm(`Delete project "${name}"?`)) return
    onDelete(id)
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
      >
        <span className="max-w-[200px] truncate">{activeProject?.name ?? 'Project'}</span>
        <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`flex items-center gap-1 px-3 py-1.5 group ${
                project.id === activeProjectId ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              {renamingId === project.id ? (
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  className="flex-1 text-sm px-1 py-0.5 border border-blue-300 rounded outline-none"
                />
              ) : (
                <>
                  <button
                    onClick={() => { onSwitch(project.id); setOpen(false) }}
                    className="flex-1 text-left text-sm text-gray-700 truncate"
                  >
                    {project.name}
                  </button>
                  <button
                    onClick={() => startRename(project)}
                    className="p-0.5 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                    title="Rename"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M12.146.854a.5.5 0 0 1 .708 0l2.292 2.292a.5.5 0 0 1 0 .708l-9.5 9.5a.5.5 0 0 1-.168.11l-4 1.5a.5.5 0 0 1-.65-.65l1.5-4a.5.5 0 0 1 .11-.168l9.5-9.5zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207l-8 8 .146.353 1.794 1.794.353.146 8-8zM1.95 13.636l.394-1.05 1.07 1.07-1.05.394a.5.5 0 0 1-.414-.414z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(project.id, project.name)}
                    disabled={projects.length <= 1}
                    className={`p-0.5 opacity-0 group-hover:opacity-100 ${
                      projects.length <= 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                      <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5.5l1-1h3l1 1H13a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}
          <hr className="my-1 border-gray-200" />
          <button
            onClick={handleCreate}
            className="w-full text-left px-3 py-1.5 text-sm text-blue-600 hover:bg-gray-50"
          >
            + New Project
          </button>
        </div>
      )}
    </div>
  )
}
