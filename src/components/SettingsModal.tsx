import { useState } from 'react'
import type { AppSettings } from '../types'

type Tab = 'general' | 'oauth'

interface SettingsModalProps {
  settings: AppSettings
  clientId: string
  onSave: (settings: AppSettings, clientId: string) => void
  onCancel: () => void
}

export function SettingsModal({ settings, clientId, onSave, onCancel }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [chartStartDate, setChartStartDate] = useState(settings.chartStartDate)
  const [chartEndDate, setChartEndDate] = useState(settings.chartEndDate)
  const [oauthClientId, setOauthClientId] = useState(clientId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ chartStartDate, chartEndDate }, oauthClientId.trim())
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'oauth', label: 'OAuth' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg"
      >
        <h2 className="text-lg font-semibold mb-4">Settings</h2>

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium -mb-px ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* General tab */}
        {activeTab === 'general' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Chart Start Date</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={chartStartDate}
                  onChange={(e) => setChartStartDate(e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setChartStartDate('')}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-500"
                  title="Reset to auto"
                >
                  Clear
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Leave empty for automatic range</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chart End Date</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={chartEndDate}
                  onChange={(e) => setChartEndDate(e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setChartEndDate('')}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-500"
                  title="Reset to auto"
                >
                  Clear
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Leave empty for automatic range</p>
            </div>
          </div>
        )}

        {/* OAuth tab */}
        {activeTab === 'oauth' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Google Cloud OAuth Client ID
              </label>
              <input
                type="text"
                value={oauthClientId}
                onChange={(e) => setOauthClientId(e.target.value)}
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
                <li>Configure the <strong>OAuth consent screen</strong> and use these URLs:
                  <ul className="list-disc ml-4 mt-0.5 space-y-0.5">
                    <li>Privacy Policy: <code className="bg-gray-100 px-1 rounded">https://emcniece.github.io/ganttlet/#/privacy</code></li>
                    <li>Terms of Service: <code className="bg-gray-100 px-1 rounded">https://emcniece.github.io/ganttlet/#/terms</code></li>
                  </ul>
                </li>
                <li>Create an <strong>OAuth 2.0 Client ID</strong> (Web application)</li>
                <li>Add your site's origin to <strong>Authorized JavaScript origins</strong></li>
              </ol>
            </div>
          </div>
        )}

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
