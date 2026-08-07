/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createLifeHubDocument, parseLifeHubDocument } from '../cloud/lifeHub'
import type { LifeHubDocument } from '../cloud/lifeHub'
import {
  createJsonFile,
  downloadJson,
  findLifeHubFile,
  requestDriveAccess,
  revokeDriveAccess,
  updateJsonFile,
} from '../cloud/googleDrive'
import { getLocalUpdatedAt, setLocalUpdatedAt } from '../utils/storage'
import { useStore } from './useStore'

type SyncStatus = 'unconfigured' | 'disconnected' | 'connecting' | 'syncing' | 'synced' | 'error'

interface DriveSyncContextValue {
  status: SyncStatus
  configured: boolean
  lastSyncedAt: string | null
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  syncNow: () => Promise<void>
}

const DriveSyncContext = createContext<DriveSyncContextValue | null>(null)
const DEFAULT_GOOGLE_CLIENT_ID = '894220468485-l4lskba7p745relh8so7eug87r8fi39r.apps.googleusercontent.com'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || DEFAULT_GOOGLE_CLIENT_ID

export function DriveSyncProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore()
  const stateRef = useRef(state)
  const tokenRef = useRef<string | null>(null)
  const fileIdRef = useRef<string | null>(null)
  const documentRef = useRef<LifeHubDocument | undefined>(undefined)
  const readyRef = useRef(false)
  const applyingRemoteRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastStateJsonRef = useRef(JSON.stringify(state))
  const configured = Boolean(GOOGLE_CLIENT_ID)
  const [status, setStatus] = useState<SyncStatus>(configured ? 'disconnected' : 'unconfigured')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { stateRef.current = state }, [state])

  const pushState = useCallback(async () => {
    const token = tokenRef.current
    if (!token) throw new Error('Reconnectez Google Drive')
    setStatus('syncing')
    setError(null)
    const updatedAt = getLocalUpdatedAt()
    const document = createLifeHubDocument(stateRef.current, updatedAt, documentRef.current)
    const file = fileIdRef.current
      ? await updateJsonFile(token, fileIdRef.current, document)
      : await createJsonFile(token, document)
    fileIdRef.current = file.id
    documentRef.current = document
    setLastSyncedAt(updatedAt)
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
    const remote = parseLifeHubDocument(await downloadJson<unknown>(token, file.id))
    documentRef.current = remote
    const remoteUpdatedAt = remote.modules.trainhard.updatedAt
    const localUpdatedAt = getLocalUpdatedAt()

    if (Date.parse(remoteUpdatedAt) > Date.parse(localUpdatedAt)) {
      applyingRemoteRef.current = true
      dispatch({ type: 'IMPORT_STATE', payload: remote.modules.trainhard.data })
      stateRef.current = remote.modules.trainhard.data
      lastStateJsonRef.current = JSON.stringify(remote.modules.trainhard.data)
      setLocalUpdatedAt(remoteUpdatedAt)
      queueMicrotask(() => { applyingRemoteRef.current = false })
      setLastSyncedAt(remoteUpdatedAt)
      setStatus('synced')
    } else {
      await pushState()
    }
    readyRef.current = true
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
      setError(caught instanceof Error ? caught.message : 'Échec de la connexion Google Drive')
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
    try {
      await pushState()
    } catch (caught) {
      setStatus('error')
      setError(caught instanceof Error ? caught.message : 'Échec de la synchronisation')
    }
  }, [pushState])

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

  return (
    <DriveSyncContext.Provider value={{ status, configured, lastSyncedAt, error, connect, disconnect, syncNow }}>
      {children}
    </DriveSyncContext.Provider>
  )
}

export function useDriveSync() {
  const context = useContext(DriveSyncContext)
  if (!context) throw new Error('useDriveSync must be used within DriveSyncProvider')
  return context
}
