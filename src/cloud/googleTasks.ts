import { classify, packNotes, SERVICE_LIST, unpackNotes } from '../voice/engine.ts'
import type { VoiceTask } from '../voice/engine.ts'

export interface GoogleTaskInput {
  id?: string
  listId?: string
  title: string
  notes?: string
  dueDate?: string
  done: boolean
}

export interface GoogleTaskResult {
  id: string
  listId: string
  webViewLink?: string
}

export class GoogleTasksError extends Error {
  readonly status: number

  constructor(status: number) {
    super(status === 401 ? 'La connexion Google a expiré. Reconnectez-vous pour actualiser les demandes.' : status === 412 ? 'Cette demande a changé dans Google. Actualisez avant de réessayer.' : status === 403
      ? 'Google Tasks n’est pas encore autorisé. Activez l’API Google Tasks dans le projet Google Cloud.'
      : `Google Tasks a refusé la requête (${status}).`)
    this.status = status
  }
}

export interface TaskList { id: string; title: string }
export interface AutomationHealth {
  active: boolean
  lastRun?: string | null
  message?: string
  startedAt?: string
  sourceListId: string
  sourceListTitle?: string
  shoppingListId?: string
  notesListId?: string
  errors?: number
}
export interface VoiceWorkspace {
  source: TaskList
  tasks: VoiceTask[]
  shopping: VoiceTask[]
  notes: VoiceTask[]
  health?: AutomationHealth
  fetchedAt: string
}

async function pages<T>(token: string, url: string): Promise<T[]> {
  const items: T[] = []
  let pageToken: string | undefined
  do {
    const next = new URL(url)
    next.searchParams.set('maxResults', '100')
    if (pageToken) next.searchParams.set('pageToken', pageToken)
    const response = await tasksFetch(token, next.href)
    const data = await response.json() as { items?: T[]; nextPageToken?: string }
    items.push(...(data.items ?? []))
    pageToken = data.nextPageToken
  } while (pageToken)
  return items
}

export async function listTasks(token: string, listId: string): Promise<VoiceTask[]> {
  return (await pages<VoiceTask>(token, `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks?showCompleted=true&showHidden=true`)).filter(task => !task.deleted)
}

export async function readVoiceWorkspace(token: string): Promise<VoiceWorkspace> {
  const lists = await pages<TaskList>(token, 'https://tasks.googleapis.com/tasks/v1/users/@me/lists')
  const service = lists.find(list => list.title === SERVICE_LIST)
  let health: AutomationHealth | undefined
  if (service) {
    const tasks = await listTasks(token, service.id)
    try {
      const candidate = JSON.parse(tasks.find(task => task.title === 'État de l’automatisation')?.notes || 'null') as AutomationHealth | null
      if (candidate && typeof candidate.active === 'boolean' && typeof candidate.sourceListId === 'string') health = candidate
    } catch { /* An edited status task must never prevent access to the inbox. */ }
  }
  const sourceResponse = await tasksFetch(token, `https://tasks.googleapis.com/tasks/v1/users/@me/lists/${encodeURIComponent(health?.sourceListId || '@default')}`)
  const source = await sourceResponse.json() as TaskList
  const [tasks, shopping, notes] = await Promise.all([
    listTasks(token, source.id),
    health?.shoppingListId ? listTasks(token, health.shoppingListId) : Promise.resolve([]),
    health?.notesListId ? listTasks(token, health.notesListId) : Promise.resolve([]),
  ])
  return { source, tasks, shopping, notes, health, fetchedAt: new Date().toISOString() }
}

export async function patchVoiceTask(token: string, listId: string, task: VoiceTask, patch: Partial<Pick<VoiceTask, 'notes' | 'status' | 'title'>>) {
  const response = await tasksFetch(token, `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(task.id)}`, {
    method: 'PATCH', headers: task.etag ? { 'If-Match': task.etag } : {}, body: JSON.stringify(patch),
  })
  return response.json() as Promise<VoiceTask>
}

export async function createVoiceCapture(token: string, listId: string, title: string, captureId: string) {
  const existing = (await listTasks(token, listId)).find(task => unpackNotes(task.notes).meta?.captureId === captureId)
  if (existing) return existing
  const response = await tasksFetch(token, `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks`, {
    method: 'POST', body: JSON.stringify({ title, notes: packNotes('', { version: 1, state: 'queued', captureId, intent: classify(title) }) }),
  })
  return response.json() as Promise<VoiceTask>
}

async function tasksFetch(accessToken: string, url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      ...init?.headers,
    },
  })
  if (!response.ok) throw new GoogleTasksError(response.status)
  return response
}

export async function upsertGoogleTask(accessToken: string, input: GoogleTaskInput): Promise<GoogleTaskResult> {
  const listId = input.listId || '@default'
  const body = {
    title: input.title.trim() || 'Tâche Life Hub',
    notes: input.notes,
    status: input.done ? 'completed' : 'needsAction',
    ...(input.dueDate ? { due: `${input.dueDate}T00:00:00.000Z` } : {}),
  }
  const base = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks`
  const response = await tasksFetch(accessToken, input.id ? `${base}/${encodeURIComponent(input.id)}` : base, {
    method: input.id ? 'PATCH' : 'POST',
    body: JSON.stringify(body),
  })
  const task = await response.json() as { id: string; webViewLink?: string }
  return { id: task.id, listId, webViewLink: task.webViewLink }
}
