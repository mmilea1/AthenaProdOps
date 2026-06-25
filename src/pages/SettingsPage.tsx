import { useState, useEffect } from 'react'

interface SettingsData {
  jiraBaseUrl: string
  jiraUserEmail: string
  hasToken: boolean
  tokenPreview: string
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center py-3 border-b border-gray-100 last:border-0">
      <span className="w-44 text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  )
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [jiraBaseUrl, setJiraBaseUrl] = useState('')
  const [jiraUserEmail, setJiraUserEmail] = useState('')
  const [jiraApiToken, setJiraApiToken] = useState('')

  function loadSettings() {
    setLoading(true)
    fetch('/api/settings')
      .then((r) => r.json() as Promise<SettingsData>)
      .then((data) => {
        setSettings(data)
        setJiraBaseUrl(data.jiraBaseUrl)
        setJiraUserEmail(data.jiraUserEmail)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load settings')
        setLoading(false)
      })
  }

  useEffect(() => { loadSettings() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const body: Record<string, string> = { jiraBaseUrl, jiraUserEmail }
      if (jiraApiToken.trim()) body.jiraApiToken = jiraApiToken.trim()

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Save failed')

      setSaved(true)
      setJiraApiToken('')
      setEditing(false)
      loadSettings()
    } catch {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="px-8 py-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">
        Manage your Jira connection. Changes are saved to your local{' '}
        <code className="bg-gray-100 px-1 rounded text-xs">.env</code> file.
      </p>

      {/* Current config display */}
      {!editing && settings && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Jira Connection</h2>
            <button
              onClick={() => { setEditing(true); setSaved(false) }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Edit
            </button>
          </div>
          <div className="px-5">
            <Row label="Jira URL" value={settings.jiraBaseUrl || '—'} />
            <Row label="User Email" value={settings.jiraUserEmail || '—'} />
            <div className="flex items-center py-3">
              <span className="w-44 text-sm text-gray-500 shrink-0">Access Token</span>
              {settings.hasToken ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                    {settings.tokenPreview}
                  </span>
                  <span className="text-xs font-medium text-green-600">✓ Configured</span>
                </div>
              ) : (
                <span className="text-sm text-red-500">Not set</span>
              )}
            </div>
          </div>
        </div>
      )}

      {saved && !editing && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3 mb-4">
          ✓ Settings saved successfully.
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Jira Connection</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jira Base URL</label>
                <input
                  type="url"
                  value={jiraBaseUrl}
                  onChange={(e) => setJiraBaseUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://athenajira.athenahealth.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                <input
                  type="email"
                  value={jiraUserEmail}
                  onChange={(e) => setJiraUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="you@athenahealth.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Access Token
                  {settings?.hasToken && (
                    <span className="ml-2 text-xs font-normal text-gray-400">(leave blank to keep current)</span>
                  )}
                </label>
                <input
                  type="password"
                  value={jiraApiToken}
                  onChange={(e) => setJiraApiToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder={settings?.hasToken ? '••••••••••••••••••' : 'Paste your Jira Personal Access Token'}
                  autoComplete="off"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Generate at: Jira → Profile → Personal Access Tokens → Create token
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => { setEditing(false); setError(null) }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#2D1B69' }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
