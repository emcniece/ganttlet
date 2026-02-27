const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets'

let scriptLoaded = false
let tokenClient: google.accounts.oauth2.TokenClient | null = null

export function loadGisScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`)
    if (existing) {
      scriptLoaded = true
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = GIS_SCRIPT_URL
    script.async = true
    script.onload = () => {
      scriptLoaded = true
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script'))
    document.head.appendChild(script)
  })
}

export async function getAccessToken(clientId: string): Promise<string> {
  await loadGisScript()

  return new Promise((resolve, reject) => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error))
          return
        }
        resolve(response.access_token)
      },
      error_callback: (error) => {
        reject(new Error(error.message || 'OAuth error'))
      },
    })

    tokenClient.requestAccessToken({ prompt: '' })
  })
}
