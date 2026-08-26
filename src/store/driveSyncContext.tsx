/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createLifeHubDocument, parseLifeHubDocument } from '../cloud/lifeHub'
import type { LifeHubDocument } from '../cloud/lifeHub'
import {
  createGoogleDocument,
  createJsonFile,
  downloadJson,
  downloadJsonRevision,
  findLifeHubFile,
  exportGoogleDocumentText,
  isDriveAuthError,
  listJsonRevisions,
  listGoogleDocuments,
  requestDriveAccess,
  revokeDriveAccess,
  updateJsonFile,
} from '../cloud/googleDrive'
import type { GoogleDocumentSummary } from '../cloud/googleDrive'
import { upsertGoogleTask } from '../cloud/googleTasks'
import type { GoogleTaskInput, GoogleTaskResult } from '../cloud/googleTasks'
import { getLocalUpdatedAt, mergeAppStates, setLocalUpdatedAt } from '../utils/storage'
import type { AppState } from '../types'
import { useStore } from './useStore'
import {
  LIFE_HUB_MODULE_UPDATED_EVENT,
  LIFE_HUB_PRESENCE_IMPORTED_EVENT,
  LIFE_HUB_PROJECTS_IMPORTED_EVENT,
  loadPresenceSnapshot,
  loadProjectsSnapshot,
  savePresenceData,
  saveProjectsData,
} from '../cloud/moduleStorage'

type SyncStatus = 'unconfigured' | 'disconnected' | 'connecting' | 'syncing' | 'synced' | 'error'

interface DriveSyncContextValue {
  status: SyncStatus
  configured: boolean
  lastSyncedAt: string | null
  fileUrl: string | null
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  syncNow: () => Promise<void>
  createProjectDocument: (title: string) => Promise<string>
  syncProjectTask: (task: GoogleTaskInput) => Promise<GoogleTaskResult>
  listProjectDocuments: () => Promise<GoogleDocumentSummary[]>
  readProjectDocument: (fileId: string) => Promise<string>
}

const DriveSyncContext = createContext<DriveSyncContextValue | null>(null)
const DEFAULT_GOOGLE_CLIENT_ID = '894220468485-l4lskba7p745relh8so7eug87r8fi39r.apps.googleusercontent.com'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || DEFAULT_GOOGLE_CLIENT_ID
const DRIVE_FILE_ID_KEY = 'remy_life_hub_drive_file_id_v1'
const DRIVE_LAST_SYNC_KEY = 'remy_life_hub_drive_last_sync_v1'

function readStoredValue(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function storeSyncMetadata(fileId: string, syncedAt: string) {
  try {
    localStorage.setItem(DRIVE_FILE_ID_KEY, fileId)
    localStorage.setItem(DRIVE_LAST_SYNC_KEY, syncedAt)
  } catch {
    // The sync still succeeded even if browser storage is unavailable.
  }
}

function extractTrainhardState(value: unknown): AppState | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as { sessions?: unknown; modules?: { trainhard?: { data?: unknown } } }
  const state = (candidate.modules?.trainhard?.data ?? candidate) as Partial<AppState>
  if (!Array.isArray(state.sessions)) return null
  return state as AppState
}

async function recoverTrainhardRevision(token: string, fileId: string) {
  try {
    const revisions = await listJsonRevisions(token, fileId)
    for (const revision of revisions) {
      const value = await downloadJsonRevision<unknown>(token, fileId, revision.id)
      const state = extractTrainhardState(value)
      if (state?.sessions.length) return state
    }
  } catch {
    // Revision recovery is best-effort; normal synchronization must remain available.
  }
  return null
}

export function DriveSyncProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore()
  const stateRef = useRef(state)
  const tokenRef = useRef<string | null>(null)
  const fileIdRef = useRef<string | null>(readStoredValue(DRIVE_FILE_ID_KEY))
  const documentRef = useRef<LifeHubDocument | undefined>(undefined)
  const readyRef = useRef(false)
  const applyingRemoteRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPullAtRef = useRef(0)
  const lastStateJsonRef = useRef(JSON.stringify(state))
  const configured = Boolean(GOOGLE_CLIENT_ID)
  const [status, setStatus] = useState<SyncStatus>(configured ? 'disconnected' : 'unconfigured')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => readStoredValue(DRIVE_LAST_SYNC_KEY))
  const [fileId, setFileId] = useState<string | null>(() => readStoredValue(DRIVE_FILE_ID_KEY))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { stateRef.current = state }, [state])

  const pushState = useCallback(async () => {
    const token = tokenRef.current
    if (!token) throw new Error('Reconnectez Google Drive')
    setStatus('syncing')
    setError(null)
    const updatedAt = getLocalUpdatedAt()
    const presence = loadPresenceSnapshot()
    const projects = loadProjectsSnapshot()
    const document = createLifeHubDocument(
      stateRef.current,
      updatedAt,
      documentRef.current,
      { version: 1, updatedAt: presence.updatedAt, data: presence.data },
      { version: 1, updatedAt: projects.updatedAt, data: projects.data },
    )
    const file = fileIdRef.current
      ? await updateJsonFile(token, fileIdRef.current, document)
      : await createJsonFile(token, document)
    fileIdRef.current = file.id
    setFileId(file.id)
    documentRef.current = document
    setLastSyncedAt(document.updatedAt)
    storeSyncMetadata(file.id, document.updatedAt)
    setStatus('synced')
  }, [])

  const initialSync = useCallback(async (token: string) => {
    setStatus('syncing')
    setError(null)
    const file = await findLifeHubFile(token)
    if (!file) {
      await pushState()
      readyRef.current = true
      return
    }

    fileIdRef.current = file.id
    setFileId(file.id)
    const remote = parseLifeHubDocument(await downloadJson<unknown>(token, file.id))
    documentRef.current = remote
    const remoteUpdatedAt = remote.modules.trainhard.updatedAt
    const localUpdatedAt = getLocalUpdatedAt()
    let needsPush = false

    const localState = stateRef.current
    const remoteState = remote.modules.trainhard.data
    const remoteIsNewer = Date.parse(remoteUpdatedAt) > Date.parse(localUpdatedAt)
    let mergedState = remoteIsNewer
      ? mergeAppStates(remoteState, localState)
      : mergeAppStates(localState, remoteState)

    if (mergedState.sessions.length === 0 && !(mergedState.deletedSessionIds?.length)) {
      const recovered = await recoverTrainhardRevision(token, file.id)
      if (recovered) mergedState = mergeAppStates(mergedState, recovered)
    }

    const localChanged = JSON.stringify(mergedState) !== JSON.stringify(localState)
    const remoteChanged = JSON.stringify(mergedState) !== JSON.stringify(remoteState)
    if (localChanged) {
      applyingRemoteRef.current = true
      dispatch({ type: 'IMPORT_STATE', payload: mergedState })
      stateRef.current = mergedState
      lastStateJsonRef.current = JSON.stringify(mergedState)
      queueMicrotask(() => { applyingRemoteRef.current = false })
    }
    if (remoteChanged || !remoteIsNewer) {
      needsPush = true
      setLocalUpdatedAt(new Date().toISOString())
    } else if (localChanged) {
      setLocalUpdatedAt(remoteUpdatedAt)
    }

    const localPresence = loadPresenceSnapshot()
    const remotePresence = remote.modules.presence
    if (remotePresence && Date.parse(remotePresence.updatedAt) > Date.parse(localPresence.updatedAt)) {
      savePresenceData(remotePresence.data, remotePresence.updatedAt, false)
      window.dispatchEvent(new Event(LIFE_HUB_PRESENCE_IMPORTED_EVENT))
    } else if (!remotePresence || Date.parse(localPresence.updatedAt) > Date.parse(remotePresence.updatedAt)) {
      needsPush = true
    }

    const localProjects = loadProjectsSnapshot()
    const remoteProjects = remote.modules.projects
    if (remoteProjects && Date.parse(remoteProjects.updatedAt) > Date.parse(localProjects.updatedAt)) {
      saveProjectsData(remoteProjects.data, remoteProjects.updatedAt, false)
      window.dispatchEvent(new Event(LIFE_HUB_PROJECTS_IMPORTED_EVENT))
    } else if (!remoteProjects || Date.parse(localProjects.updatedAt) > Date.parse(remoteProjects.updatedAt)) {
      needsPush = true
    }

    readyRef.current = true
    if (needsPush) {
      await pushState()
    } else {
      setLastSyncedAt(remote.updatedAt)
      storeSyncMetadata(file.id, remote.updatedAt)
      setStatus('synced')
    }
  }, [dispatch, pushState])

  const connect = useCallback(async () => {
    if (!configured) {
      setStatus('unconfigured')
      setError('Le Client ID Google doit être configuré avant la première connexion.')
      return
    }
    try {
      setStatus('connecting')
      setError(null)
      const token = await requestDriveAccess(GOOGLE_CLIENT_ID)
      tokenRef.current = token
      await initialSync(token)
    } catch (caught) {
      tokenRef.current = null
      readyRef.current = false
      setStatus('error')
      setError(isDriveAuthError(caught)
        ? 'Connexion Google expirée. Reconnectez Google Drive puis relancez la synchronisation.'
        : caught instanceof Error ? caught.message : 'Échec de la connexion Google Drive')
    }
  }, [configured, initialSync])

  const disconnect = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (tokenRef.current) revokeDriveAccess(tokenRef.current)
    tokenRef.current = null
    fileIdRef.current = null
    documentRef.current = undefined
    readyRef.current = false
    setStatus(configured ? 'disconnected' : 'unconfigured')
    setError(null)
  }, [configured])

  const syncNow = useCallback(async () => {
    if (!tokenRef.current) {
      await connect()
      return
    }
    try {
      lastPullAtRef.current = Date.now()
      await initialSync(tokenRef.current)
    } catch (caught) {
      if (isDriveAuthError(caught)) {
        tokenRef.current = null
        readyRef.current = false
      }
      setStatus('error')
      setError(isDriveAuthError(caught)
        ? 'Connexion Google expirée. Cliquez sur « Reconnecter Google », puis synchronisez.'
        : caught instanceof Error ? caught.message : 'Échec de la synchronisation')
    }
  }, [connect, initialSync])

  const requireGoogleToken = useCallback(async () => {
    if (!tokenRef.current) await connect()
    if (!tokenRef.current) throw new Error('Connectez Google pour continuer.')
    return tokenRef.current
  }, [connect])

  const createProjectDocument = useCallback(async (title: string) => {
    const token = await requireGoogleToken()
    const file = await createGoogleDocument(token, title)
    return `https://docs.google.com/document/d/${encodeURIComponent(file.id)}/edit`
  }, [requireGoogleToken])

  const syncProjectTask = useCallback(async (task: GoogleTaskInput) => {
    const token = await requireGoogleToken()
    return upsertGoogleTask(token, task)
  }, [requireGoogleToken])

  const listProjectDocuments = useCallback(async () => {
    const token = await requireGoogleToken()
    return listGoogleDocuments(token)
  }, [requireGoogleToken])

  const readProjectDocument = useCallback(async (fileId: string) => {
    const token = await requireGoogleToken()
    return exportGoogleDocumentText(token, fileId)
  }, [requireGoogleToken])

  useEffect(() => {
    const currentJson = JSON.stringify(state)
    if (currentJson === lastStateJsonRef.current) return
    lastStateJsonRef.current = currentJson
    if (!readyRef.current || applyingRemoteRef.current || !tokenRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => { void syncNow() }, 1800)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [state, syncNow])

  useEffect(() => {
    const handleModuleUpdate = () => {
      if (!readyRef.current || !tokenRef.current) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => { void syncNow() }, 1800)
    }
    window.addEventListener(LIFE_HUB_MODULE_UPDATED_EVENT, handleModuleUpdate)
    return () => window.removeEventListener(LIFE_HUB_MODULE_UPDATED_EVENT, handleModuleUpdate)
  }, [syncNow])

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible' || !tokenRef.current || !readyRef.current) return
      if (Date.now() - lastPullAtRef.current < 30_000) return
      void syncNow()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const interval = window.setInterval(refresh, 90_000)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.clearInterval(interval)
    }
  }, [syncNow])

  return (
    <DriveSyncContext.Provider value={{
      status,
      configured,
      lastSyncedAt,
      fileUrl: fileId ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view` : null,
      error,
      connect,
      disconnect,
      syncNow,
      createProjectDocument,
      syncProjectTask,
      listProjectDocuments,
      readProjectDocument,
    }}>
      {children}
    </DriveSyncContext.Provider>
  )
}

export function useDriveSync() {
  const context = useContext(DriveSyncContext)
  if (!context) throw new Error('useDriveSync must be used within DriveSyncProvider')
  return context
}
