import type { ReactNode } from 'react'

interface LegalModalProps {
  title: string
  children: ReactNode
  onClose: () => void
}

export function LegalModal({ title, children, onClose }: LegalModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <div className="max-h-[80vh] overflow-y-auto text-sm text-gray-700 space-y-3">
          {children}
        </div>
        <div className="flex justify-end mt-5">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
