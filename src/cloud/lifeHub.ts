import type { AppState } from '../types'

export const LIFE_HUB_FILE_NAME = 'remy-life-hub.json'
export const LIFE_HUB_SCHEMA_VERSION = 1

export interface LifeHubModule<T> {
  version: number
  updatedAt: string
  data: T
}

export interface ProjectNode {
  id: string
  title: string
  parentId?: string
  status?: 'idea' | 'active' | 'paused' | 'done'
  notes?: string
  tags?: string[]
  position?: { x: number; y: number }
  color?: string
}

export interface ProjectEdge {
  id: string
  sourceId: string
  targetId: string
  label?: string
  kind?: 'parent' | 'dependency' | 'reference'
}

export interface ProjectsData {
  nodes: ProjectNode[]
  edges: ProjectEdge[]
  activeViewId?: string
}

export interface PresenceData {
  history: Array<{
    id: string | number
    title: string
    minutes: number
    date: string
  }>
}

export interface LifeHubDocument {
  schemaVersion: number
  updatedAt: string
  modules: {
    trainhard: LifeHubModule<AppState>
    presence?: LifeHubModule<PresenceData>
    projects?: LifeHubModule<ProjectsData>
  }
}

export function createLifeHubDocument(
  trainhard: AppState,
  updatedAt: string,
  existing?: LifeHubDocument,
  presence?: LifeHubModule<PresenceData>,
  projects?: LifeHubModule<ProjectsData>,
): LifeHubDocument {
  const trainhardModule: LifeHubModule<AppState> = { version: 1, updatedAt, data: trainhard }
  const modules = {
    ...existing?.modules,
    ...(presence ? { presence } : {}),
    ...(projects ? { projects } : {}),
    trainhard: trainhardModule,
  }
  const documentUpdatedAt = Object.values(modules).reduce(
    (latest, module) => Date.parse(module.updatedAt) > Date.parse(latest) ? module.updatedAt : latest,
    updatedAt,
  )
  return {
    schemaVersion: LIFE_HUB_SCHEMA_VERSION,
    updatedAt: documentUpdatedAt,
    modules,
  }
}

export function parseLifeHubDocument(value: unknown): LifeHubDocument {
  if (!value || typeof value !== 'object') throw new Error('Sauvegarde Drive illisible')
  const document = value as Partial<LifeHubDocument>
  if (document.schemaVersion !== LIFE_HUB_SCHEMA_VERSION || !document.modules?.trainhard?.data) {
    throw new Error('Format de sauvegarde Drive non compatible')
  }
  return document as LifeHubDocument
}
