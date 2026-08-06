import { LIFE_HUB_FILE_NAME } from './lifeHub'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

interface TokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}

interface TokenClient {
  callback: (response: TokenResponse) => void
  requestAccessToken: (options?: { prompt?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
          }) => TokenClient
          revoke: (token: string, callback?: () => void) => void
        }
      }
    }
  }
}

export interface DriveFile {
  id: string
  name: string
  modifiedTime?: string
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

async function driveFetch(accessToken: string, url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Google Drive ${response.status}${detail ? ` — ${detail}` : ''}`)
  }
  return response
}

export function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_URL}"]`)
    const script = existing ?? document.createElement('script')
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Impossible de charger la connexion Google'))
    if (!existing) {
      script.src = GOOGLE_SCRIPT_URL
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  })
}

export async function requestDriveAccess(clientId: string): Promise<string> {
  await loadGoogleIdentity()
  return new Promise((resolve, reject) => {
    const oauth = window.google?.accounts.oauth2
    if (!oauth) {
      reject(new Error('Service de connexion Google indisponible'))
      return
    }
    const client = oauth.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: response => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'Autorisation Google refusée'))
          return
        }
        resolve(response.access_token)
      },
    })
    client.requestAccessToken({ prompt: 'consent' })
  })
}

export async function findLifeHubFile(accessToken: string): Promise<DriveFile | null> {
  const query = encodeURIComponent(`name = '${escapeDriveQuery(LIFE_HUB_FILE_NAME)}' and trashed = false`)
  const fields = encodeURIComponent('files(id,name,modifiedTime)')
  const response = await driveFetch(
    accessToken,
    `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=${fields}`,
  )
  const data = await response.json() as { files?: DriveFile[] }
  return data.files?.[0] ?? null
}

export async function downloadJson<T>(accessToken: string, fileId: string): Promise<T> {
  const response = await driveFetch(
    accessToken,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
  )
  return response.json() as Promise<T>
}

export async function createJsonFile(accessToken: string, data: unknown): Promise<DriveFile> {
  const boundary = `trainhard_${Date.now().toString(36)}`
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify({ name: LIFE_HUB_FILE_NAME, mimeType: 'application/json' }),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(data, null, 2),
    `--${boundary}--`,
  ].join('\r\n')
  const response = await driveFetch(
    accessToken,
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime',
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
  )
  return response.json() as Promise<DriveFile>
}

export async function updateJsonFile(accessToken: string, fileId: string, data: unknown): Promise<DriveFile> {
  const response = await driveFetch(
    accessToken,
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name,modifiedTime`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data, null, 2),
    },
  )
  return response.json() as Promise<DriveFile>
}

export function revokeDriveAccess(accessToken: string) {
  window.google?.accounts.oauth2.revoke(accessToken)
}
