import type { PresenceData, ProjectsData } from './lifeHub'

const PRESENCE_DATA_KEY = 'life_hub_presence_v1'
const PRESENCE_UPDATED_AT_KEY = 'life_hub_presence_updated_at_v1'
const PROJECTS_DATA_KEY = 'life_hub_projects_v1'
const PROJECTS_UPDATED_AT_KEY = 'life_hub_projects_updated_at_v1'
const LEGACY_PRESENCE_KEY = 'present-history'

export const LIFE_HUB_MODULE_UPDATED_EVENT = 'lifehub-module-updated'
export const LIFE_HUB_PRESENCE_IMPORTED_EVENT = 'lifehub-presence-imported'
export const LIFE_HUB_PROJECTS_IMPORTED_EVENT = 'lifehub-projects-imported'

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function readTimestamp(key: string) {
  try {
    return localStorage.getItem(key) ?? new Date(0).toISOString()
  } catch {
    return new Date(0).toISOString()
  }
}

export function loadPresenceSnapshot(): { data: PresenceData; updatedAt: string } {
  const current = readJson<PresenceData | null>(PRESENCE_DATA_KEY, null)
  if (current) return { data: current, updatedAt: readTimestamp(PRESENCE_UPDATED_AT_KEY) }

  const legacyHistory = readJson<PresenceData['history']>(LEGACY_PRESENCE_KEY, [])
  const data = { history: legacyHistory }
  if (legacyHistory.length) savePresenceData(data)
  return { data, updatedAt: readTimestamp(PRESENCE_UPDATED_AT_KEY) }
}

export function savePresenceData(data: PresenceData, updatedAt = new Date().toISOString(), notify = true) {
  localStorage.setItem(PRESENCE_DATA_KEY, JSON.stringify(data))
  localStorage.setItem(PRESENCE_UPDATED_AT_KEY, updatedAt)
  localStorage.setItem(LEGACY_PRESENCE_KEY, JSON.stringify(data.history))
  if (notify) window.dispatchEvent(new CustomEvent(LIFE_HUB_MODULE_UPDATED_EVENT, { detail: { module: 'presence' } }))
}

export function loadProjectsSnapshot(): { data: ProjectsData; updatedAt: string } {
  return {
    data: readJson<ProjectsData>(PROJECTS_DATA_KEY, { nodes: [], edges: [], activeViewId: 'main' }),
    updatedAt: readTimestamp(PROJECTS_UPDATED_AT_KEY),
  }
}

export function saveProjectsData(data: ProjectsData, updatedAt = new Date().toISOString(), notify = true) {
  localStorage.setItem(PROJECTS_DATA_KEY, JSON.stringify(data))
  localStorage.setItem(PROJECTS_UPDATED_AT_KEY, updatedAt)
  if (notify) window.dispatchEvent(new CustomEvent(LIFE_HUB_MODULE_UPDATED_EVENT, { detail: { module: 'projects' } }))
}
