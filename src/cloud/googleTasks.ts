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

class GoogleTasksError extends Error {
  readonly status: number

  constructor(status: number) {
    super(status === 403
      ? 'Google Tasks n’est pas encore autorisé. Activez l’API Google Tasks dans le projet Google Cloud.'
      : `Google Tasks a refusé la requête (${status}).`)
    this.status = status
  }
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
