import { useState } from 'react'

interface SettingsModalProps {
  clientId: string
  onSave: (clientId: string) => void
  onCancel: () => void
}

export function SettingsModal({ clientId, onSave, onCancel }: SettingsModalProps) {
  const [value, setValue] = useState(clientId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(value.trim())
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg"
      >
        <h2 className="text-lg font-semibold mb-4">Settings</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Google Cloud OAuth Client ID
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="123456789-abc.apps.googleusercontent.com"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm font-mono"
            />
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>To export to Google Sheets you need an OAuth Client ID:</p>
            <ol className="list-decimal ml-4 space-y-0.5">
              <li>Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a></li>
              <li>Create a project (or select an existing one)</li>
              <li>Enable the <strong>Google Sheets API</strong></li>
              <li>Create an <strong>OAuth 2.0 Client ID</strong> (Web application)</li>
              <li>Add your site's origin to <strong>Authorized JavaScript origins</strong></li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
