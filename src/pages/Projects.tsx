import { Archive, CalendarRange, CheckSquare2, ExternalLink, GitBranch, LayoutList, Link2, Network, Orbit, Plus, Save, Square, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { ProjectNode, ProjectsData, ProjectTask } from '../cloud/lifeHub'
import { LIFE_HUB_PROJECTS_IMPORTED_EVENT, loadProjectsSnapshot, saveProjectsData } from '../cloud/moduleStorage'

type ViewMode = 'map' | 'list' | 'gantt'
type ProjectStatus = NonNullable<ProjectNode['status']>
interface GanttItem {
  id: string
  nodeId: string
  taskId?: string
  projectTitle: string
  title: string
  start: string
  end: string
  done: boolean
  color: string
  sourceUrl?: string
}

const EMPTY_PROJECTS: ProjectsData = { nodes: [], edges: [], activeViewId: 'main' }
const VIEW_KEY = 'life_hub_projects_view_v1'
const RADIAL_LAYOUT_KEY = 'life_hub_projects_radial_v1'
const CANVAS_WIDTH = 1400
const CANVAS_HEIGHT = 820
const NODE_HALF_WIDTH = 88
const NODE_HALF_HEIGHT = 36
const DAY_MS = 24 * 60 * 60 * 1000
const TODAY_ISO = new Date().toISOString().slice(0, 10)

const STATUS_LABELS: Record<ProjectStatus, string> = { idea: 'Idée', active: 'En cours', paused: 'En pause', done: 'Archivé' }
const STATUS_STYLES: Record<ProjectStatus, string> = {
  idea: 'border-slate-600 bg-slate-800 text-slate-200',
  active: 'border-amber-500/60 bg-amber-500/15 text-amber-100',
  paused: 'border-blue-500/50 bg-blue-500/10 text-blue-100',
  done: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 opacity-75',
}
const LIST_GROUPS: Array<{ status: ProjectStatus; title: string; icon: string }> = [
  { status: 'active', title: 'En cours', icon: '⚡' },
  { status: 'idea', title: 'Idées à explorer', icon: '✦' },
  { status: 'paused', title: 'En pause', icon: 'Ⅱ' },
  { status: 'done', title: 'Archivés', icon: '✓' },
]

function normalizedProjects(): ProjectsData {
  const data = loadProjectsSnapshot().data
  return { ...EMPTY_PROJECTS, ...data, nodes: data.nodes ?? [], edges: data.edges ?? [] }
}

function initialView(): ViewMode {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    return saved === 'list' || saved === 'gantt' ? saved : 'map'
  } catch { return 'map' }
}

function completionFor(node: ProjectNode) {
  if (node.tasks?.length) return Math.round((node.tasks.filter(task => task.done).length / node.tasks.length) * 100)
  if (node.status === 'done') return 100
  return Math.min(100, Math.max(0, node.progress ?? 0))
}

function toDay(value?: string) {
  if (!value) return null
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function isProjectsData(value: unknown): value is ProjectsData {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<ProjectsData>
  return Array.isArray(data.nodes) && Array.isArray(data.edges) && data.nodes.every(node => Boolean(node && typeof node.id === 'string' && typeof node.title === 'string'))
}

function projectsFromImport(value: unknown): ProjectsData | null {
  if (isProjectsData(value)) return value
  if (!value || typeof value !== 'object') return null
  const document = value as { modules?: { projects?: { data?: unknown } } }
  return isProjectsData(document.modules?.projects?.data) ? document.modules.projects.data : null
}

function radialLayout(data: ProjectsData): ProjectsData {
  if (!data.nodes.length) return data
  const ids = new Set(data.nodes.map(node => node.id))
  const childrenOf = (id: string) => data.nodes.filter(node => node.parentId === id)
  const roots = data.nodes.filter(node => !node.parentId || !ids.has(node.parentId))
  const countDescendants = (id: string, visited = new Set<string>()): number => {
    if (visited.has(id)) return 0
    visited.add(id)
    return childrenOf(id).reduce((total, child) => total + 1 + countDescendants(child.id, visited), 0)
  }
  const mainRoot = [...(roots.length ? roots : data.nodes)].sort((a, b) => countDescendants(b.id) - countDescendants(a.id))[0]
  const firstRing = [...childrenOf(mainRoot.id), ...roots.filter(node => node.id !== mainRoot.id)]
  const positions = new Map<string, { x: number; y: number }>()
  const placed = new Set<string>()
  const centerX = CANVAS_WIDTH / 2
  const centerY = CANVAS_HEIGHT / 2
  const polar = (angle: number, radius: number) => ({ x: centerX + Math.cos(angle) * radius - NODE_HALF_WIDTH, y: centerY + Math.sin(angle) * radius - NODE_HALF_HEIGHT })

  positions.set(mainRoot.id, { x: centerX - NODE_HALF_WIDTH, y: centerY - NODE_HALF_HEIGHT })
  placed.add(mainRoot.id)
  firstRing.forEach((node, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(1, firstRing.length)
    positions.set(node.id, polar(angle, 205))
    placed.add(node.id)
    const children = childrenOf(node.id)
    const angularStep = children.length > 1 ? Math.min(0.24, 0.72 / (children.length - 1)) : 0
    children.forEach((child, childIndex) => {
      const childAngle = angle + (childIndex - (children.length - 1) / 2) * angularStep
      positions.set(child.id, polar(childAngle, 390))
      placed.add(child.id)
    })
  })

  const remaining = data.nodes.filter(node => !placed.has(node.id))
  remaining.forEach((node, index) => positions.set(node.id, polar(-Math.PI / 2 + (index * Math.PI * 2) / Math.max(1, remaining.length), 350)))
  return { ...data, nodes: data.nodes.map(node => ({ ...node, position: positions.get(node.id) ?? node.position })) }
}

function GanttView({ projects, onSelectNode, onToggleTask, onToggleNode }: {
  projects: ProjectsData
  onSelectNode: (id: string) => void
  onToggleTask: (nodeId: string, taskId: string) => void
  onToggleNode: (nodeId: string) => void
}) {
  const items: GanttItem[] = projects.nodes.flatMap<GanttItem>(node => {
    const tasks: GanttItem[] = (node.tasks ?? []).filter(task => task.startDate || task.dueDate).map(task => ({
      id: `${node.id}:${task.id}`,
      nodeId: node.id,
      taskId: task.id,
      projectTitle: node.title,
      title: task.title,
      start: task.startDate ?? task.dueDate!,
      end: task.dueDate ?? task.startDate!,
      done: task.done,
      color: node.color ?? '#f59e0b',
      sourceUrl: task.sourceUrl,
    }))
    if (tasks.length || (!node.startDate && !node.dueDate)) return tasks
    return [{
      id: node.id,
      nodeId: node.id,
      taskId: undefined,
      projectTitle: node.title,
      title: node.title,
      start: node.startDate ?? node.dueDate!,
      end: node.dueDate ?? node.startDate!,
      done: node.status === 'done',
      color: node.color ?? '#f59e0b',
      sourceUrl: node.sourceUrl,
    }]
  }).filter(item => toDay(item.start) && toDay(item.end))

  if (!items.length) return (
    <div className="grid min-h-[520px] place-items-center p-6 text-center">
      <div className="max-w-md"><CalendarRange className="mx-auto text-amber-400" size={44} /><h2 className="mt-4 text-2xl font-black">Le Gantt est prêt</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">Sélectionne une carte, ajoute des tâches puis renseigne leurs dates de début et de fin. Elles apparaîtront automatiquement ici.</p></div>
    </div>
  )

  const todayTime = toDay(TODAY_ISO)!.getTime()
  const starts = items.map(item => toDay(item.start)!.getTime())
  const ends = items.map(item => toDay(item.end)!.getTime())
  const minTime = Math.min(todayTime, ...starts) - (2 * DAY_MS)
  const maxTime = Math.max(todayTime, ...ends) + (7 * DAY_MS)
  const span = Math.max(DAY_MS, maxTime - minTime)
  const totalDays = Math.ceil(span / DAY_MS)
  const timelineWidth = Math.max(760, totalDays * 24)
  const markers = Array.from({ length: Math.ceil(totalDays / 7) + 1 }, (_, index) => {
    const time = minTime + index * 7 * DAY_MS
    return { time, label: new Date(time).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }
  })
  const todayLeft = ((todayTime - minTime) / span) * 100

  return (
    <div className="overflow-auto p-4 lg:p-6">
      <div className="min-w-max overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80 shadow-2xl">
        <div className="grid grid-cols-[260px_auto] border-b border-slate-800 bg-slate-900/90">
          <div className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Tâches planifiées</div>
          <div className="relative h-12" style={{ width: timelineWidth }}>
            {markers.map(marker => <div key={marker.time} className="absolute inset-y-0 border-l border-slate-700/60 pl-2 pt-3 text-[10px] font-bold text-slate-500" style={{ left: `${((marker.time - minTime) / span) * 100}%` }}>{marker.label}</div>)}
          </div>
        </div>
        {items.map(item => {
          const start = toDay(item.start)!.getTime()
          const end = Math.max(start, toDay(item.end)!.getTime())
          const left = ((start - minTime) / span) * 100
          const width = Math.max(1.5, (((end - start) + DAY_MS) / span) * 100)
          return <div key={item.id} className="grid grid-cols-[260px_auto] border-b border-slate-800/70 last:border-b-0">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <button onClick={() => item.taskId ? onToggleTask(item.nodeId, item.taskId) : onToggleNode(item.nodeId)} className={item.done ? 'text-emerald-400' : 'text-slate-600'}>{item.done ? <CheckSquare2 size={18} /> : <Square size={18} />}</button>
              <button onClick={() => onSelectNode(item.nodeId)} className="min-w-0 flex-1 text-left"><span className={`block truncate text-xs font-black ${item.done ? 'text-slate-600 line-through' : 'text-white'}`}>{item.title}</span><span className="block truncate text-[9px] text-slate-600">{item.projectTitle}</span></button>
              {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400"><ExternalLink size={13} /></a>}
            </div>
            <div className="relative h-14 bg-[linear-gradient(to_right,rgba(51,65,85,0.18)_1px,transparent_1px)] [background-size:24px_100%]" style={{ width: timelineWidth }}>
              <div className="absolute inset-y-0 z-10 border-l border-rose-400/60" style={{ left: `${todayLeft}%` }}><span className="absolute left-1 top-1 text-[8px] font-black uppercase text-rose-400">Aujourd’hui</span></div>
              <button onClick={() => onSelectNode(item.nodeId)} className={`absolute top-5 h-6 min-w-6 rounded-full px-2 text-left text-[9px] font-black text-slate-950 shadow-lg ${item.done ? 'opacity-45' : ''}`} style={{ left: `${left}%`, width: `${width}%`, backgroundColor: item.color }} title={`${item.start} → ${item.end}`}>{item.done ? '✓ ' : ''}{item.title}</button>
            </div>
          </div>
        })}
      </div>
    </div>
  )
}

export function Projects() {
  const [projects, setProjects] = useState<ProjectsData>(normalizedProjects)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(initialView)
  const [importMessage, setImportMessage] = useState('')
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const projectsRef = useRef(projects)
  const autoLayoutDone = useRef(false)
  const selected = projects.nodes.find(node => node.id === selectedId)
  const selectedParent = selected?.parentId ? projects.nodes.find(node => node.id === selected.parentId) : undefined
  const selectedChildren = selected ? projects.nodes.filter(node => node.parentId === selected.id) : []

  useEffect(() => { projectsRef.current = projects }, [projects])
  useEffect(() => {
    const refresh = () => setProjects(normalizedProjects())
    window.addEventListener(LIFE_HUB_PROJECTS_IMPORTED_EVENT, refresh)
    return () => window.removeEventListener(LIFE_HUB_PROJECTS_IMPORTED_EVENT, refresh)
  }, [])
  useEffect(() => {
    if (autoLayoutDone.current || projects.nodes.length < 2) return
    autoLayoutDone.current = true
    try {
      if (localStorage.getItem(RADIAL_LAYOUT_KEY)) return
      localStorage.setItem(RADIAL_LAYOUT_KEY, '1')
    } catch { /* disposition toujours applicable */ }
    const next = radialLayout(projectsRef.current)
    projectsRef.current = next
    setProjects(next)
    saveProjectsData(next)
  }, [projects.nodes.length])

  function persist(next: ProjectsData) {
    projectsRef.current = next
    setProjects(next)
    saveProjectsData(next)
  }

  function chooseView(next: ViewMode) {
    setViewMode(next)
    try { localStorage.setItem(VIEW_KEY, next) } catch { /* préférence non mémorisable */ }
  }

  function applyRadialLayout() {
    persist(radialLayout(projects))
    setImportMessage('Disposition radiale recalculée.')
    try { localStorage.setItem(RADIAL_LAYOUT_KEY, '1') } catch { /* préférence non mémorisable */ }
  }

  function addNode(parent?: ProjectNode) {
    const id = crypto.randomUUID()
    const index = projects.nodes.length
    const node: ProjectNode = {
      id,
      title: parent ? 'Nouvelle branche' : index ? 'Nouvelle idée' : 'Mon projet central',
      parentId: parent?.id,
      status: 'idea',
      notes: '',
      tags: [],
      color: parent?.color ?? '#f59e0b',
      position: parent?.position
        ? { x: parent.position.x + 220, y: parent.position.y + ((index % 3) - 1) * 105 }
        : { x: CANVAS_WIDTH / 2 - NODE_HALF_WIDTH, y: CANVAS_HEIGHT / 2 - NODE_HALF_HEIGHT },
    }
    const edge = parent ? [{ id: crypto.randomUUID(), sourceId: parent.id, targetId: id, kind: 'parent' as const }] : []
    persist({ ...projects, nodes: [...projects.nodes, node], edges: [...projects.edges, ...edge] })
    setSelectedId(id)
  }

  async function importProjects(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const imported = projectsFromImport(JSON.parse(await file.text()))
      if (!imported) throw new Error('format')
      const importedById = new Map(imported.nodes.map(node => [node.id, node]))
      let enriched = 0
      const mergedExisting = projects.nodes.map(current => {
        const incoming = importedById.get(current.id)
        if (!incoming) return current
        const next = {
          ...incoming,
          ...current,
          notes: current.notes || incoming.notes,
          tags: current.tags?.length ? current.tags : incoming.tags,
          sourceUrl: current.sourceUrl || incoming.sourceUrl,
          startDate: current.startDate || incoming.startDate,
          dueDate: current.dueDate || incoming.dueDate,
          tasks: current.tasks?.length ? current.tasks : incoming.tasks,
          position: current.position ?? incoming.position,
        }
        if (!current.sourceUrl && next.sourceUrl) enriched++
        return next
      })
      const existingIds = new Set(projects.nodes.map(node => node.id))
      const newNodes = imported.nodes.filter(node => !existingIds.has(node.id))
      const allNodes = [...mergedExisting, ...newNodes]
      const knownNodeIds = new Set(allNodes.map(node => node.id))
      const edgeIds = new Set(projects.edges.map(edge => edge.id))
      const newEdges = imported.edges.filter(edge => !edgeIds.has(edge.id) && knownNodeIds.has(edge.sourceId) && knownNodeIds.has(edge.targetId))
      persist({ ...projects, nodes: allNodes, edges: [...projects.edges, ...newEdges] })
      setImportMessage(`${newNodes.length} carte${newNodes.length > 1 ? 's' : ''} ajoutée${newNodes.length > 1 ? 's' : ''}${enriched ? ` · ${enriched} lien${enriched > 1 ? 's' : ''} Drive associé${enriched > 1 ? 's' : ''}` : ''}.`)
    } catch {
      setImportMessage('Fichier incompatible : utilisez un export Projets Life Hub.')
    }
  }

  function updateNode(changes: Partial<ProjectNode>) {
    if (!selectedId) return
    persist({ ...projects, nodes: projects.nodes.map(node => node.id === selectedId ? { ...node, ...changes } : node) })
  }

  function toggleNodeDone(nodeId: string) {
    persist({ ...projects, nodes: projects.nodes.map(node => {
      if (node.id !== nodeId) return node
      const completing = node.status !== 'done'
      return { ...node, status: completing ? 'done' : 'active', tasks: node.tasks?.map(task => ({ ...task, done: completing })) }
    }) })
  }

  function addTask(nodeId: string) {
    const task: ProjectTask = { id: crypto.randomUUID(), title: 'Nouvelle tâche', done: false }
    persist({ ...projects, nodes: projects.nodes.map(node => node.id === nodeId ? { ...node, tasks: [...(node.tasks ?? []), task], status: node.status === 'done' ? 'active' : node.status } : node) })
  }

  function updateTask(nodeId: string, taskId: string, changes: Partial<ProjectTask>) {
    persist({ ...projects, nodes: projects.nodes.map(node => {
      if (node.id !== nodeId) return node
      const tasks = (node.tasks ?? []).map(task => task.id === taskId ? { ...task, ...changes } : task)
      const allDone = tasks.length > 0 && tasks.every(task => task.done)
      return { ...node, tasks, status: allDone ? 'done' : node.status === 'done' ? 'active' : node.status }
    }) })
  }

  function toggleTask(nodeId: string, taskId: string) {
    const node = projects.nodes.find(item => item.id === nodeId)
    const task = node?.tasks?.find(item => item.id === taskId)
    if (task) updateTask(nodeId, taskId, { done: !task.done })
  }

  function deleteTask(nodeId: string, taskId: string) {
    persist({ ...projects, nodes: projects.nodes.map(node => node.id === nodeId ? { ...node, tasks: (node.tasks ?? []).filter(task => task.id !== taskId) } : node) })
  }

  function deleteNode() {
    if (!selectedId) return
    persist({
      ...projects,
      nodes: projects.nodes.filter(node => node.id !== selectedId),
      edges: projects.edges.filter(edge => edge.sourceId !== selectedId && edge.targetId !== selectedId),
    })
    setSelectedId(null)
  }

  function startDrag(event: ReactPointerEvent, node: ProjectNode) {
    const canvas = canvasRef.current?.getBoundingClientRect()
    if (!canvas) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { id: node.id, offsetX: event.clientX - canvas.left - (node.position?.x ?? 0), offsetY: event.clientY - canvas.top - (node.position?.y ?? 0) }
    setSelectedId(node.id)
  }

  function moveNode(event: ReactPointerEvent) {
    const drag = dragRef.current
    const canvas = canvasRef.current?.getBoundingClientRect()
    if (!drag || !canvas) return
    const x = Math.max(8, Math.min(canvas.width - 185, event.clientX - canvas.left - drag.offsetX))
    const y = Math.max(8, Math.min(canvas.height - 76, event.clientY - canvas.top - drag.offsetY))
    setProjects(current => {
      const next = { ...current, nodes: current.nodes.map(node => node.id === drag.id ? { ...node, position: { x, y } } : node) }
      projectsRef.current = next
      return next
    })
  }

  function finishDrag() {
    if (!dragRef.current) return
    dragRef.current = null
    saveProjectsData(projectsRef.current)
  }

  return (
    <div className="flex min-h-full flex-col bg-[#090b12] text-slate-100">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-3 lg:px-8">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">Projets & MindMap</p>
          <h1 className="truncate text-xl font-black sm:text-2xl">Clarifier, relier, avancer.</h1>
        </div>
        <span className="mr-2 text-xs text-slate-500">{projects.nodes.length} cartes · sauvegarde automatique</span>
        <div className="flex rounded-xl border border-slate-700 bg-slate-900 p-1">
          <button onClick={() => chooseView('map')} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black ${viewMode === 'map' ? 'bg-amber-500 text-slate-950' : 'text-slate-500'}`}><Network size={15} /> Carte</button>
          <button onClick={() => chooseView('list')} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black ${viewMode === 'list' ? 'bg-amber-500 text-slate-950' : 'text-slate-500'}`}><LayoutList size={15} /> Liste</button>
          <button onClick={() => chooseView('gantt')} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black ${viewMode === 'gantt' ? 'bg-amber-500 text-slate-950' : 'text-slate-500'}`}><CalendarRange size={15} /> Gantt</button>
        </div>
        {viewMode === 'map' && <button onClick={applyRadialLayout} className="flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-xs font-black text-violet-300"><Orbit size={16} /> Disposition en étoile</button>}
        <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={importProjects} />
        <button onClick={() => importRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-300"><Upload size={16} /> Importer</button>
        <button onClick={() => addNode()} className="flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-slate-950"><Plus size={16} /> Nouvelle idée</button>
      </header>

      {importMessage && <button onClick={() => setImportMessage('')} className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-left text-xs font-bold text-amber-200 lg:px-8">{importMessage} <span className="ml-2 opacity-60">×</span></button>}

      <div className="relative flex-1 overflow-auto">
        {viewMode === 'map' ? (
          <div ref={canvasRef} onPointerMove={moveNode} onPointerUp={finishDrag} onPointerCancel={finishDrag} style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
            className="relative min-h-[720px] min-w-[1100px] overflow-hidden bg-[radial-gradient(circle_at_1px_1px,#334155_1px,transparent_0)] [background-size:24px_24px]">
            {projects.nodes.length === 0 && <div className="absolute inset-0 grid place-items-center p-6 text-center"><div><GitBranch className="mx-auto text-amber-400" size={42} /><h2 className="mt-4 text-2xl font-black">Posez votre première idée</h2><p className="mt-2 text-sm text-slate-500">Créez un noyau central, puis faites rayonner ses branches.</p><button onClick={() => addNode()} className="mt-5 rounded-xl bg-amber-500 px-5 py-3 font-black text-slate-950">Créer le noyau</button></div></div>}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              {projects.edges.map(edge => {
                const source = projects.nodes.find(node => node.id === edge.sourceId)
                const target = projects.nodes.find(node => node.id === edge.targetId)
                if (!source || !target) return null
                return <line key={edge.id} x1={(source.position?.x ?? 0) + NODE_HALF_WIDTH} y1={(source.position?.y ?? 0) + NODE_HALF_HEIGHT} x2={(target.position?.x ?? 0) + NODE_HALF_WIDTH} y2={(target.position?.y ?? 0) + NODE_HALF_HEIGHT} stroke={source.color ?? '#64748b'} strokeOpacity="0.6" strokeWidth="2" strokeDasharray={edge.kind === 'reference' ? '5 5' : undefined} />
              })}
            </svg>
            {projects.nodes.map(node => {
              const status = node.status ?? 'idea'
              const isCore = !node.parentId
              return <button key={node.id} onPointerDown={event => startDrag(event, node)} onDoubleClick={() => setSelectedId(node.id)}
                style={{ left: node.position?.x ?? 40, top: node.position?.y ?? 40, borderColor: selectedId === node.id || isCore ? node.color : undefined }}
                className={`absolute w-44 touch-none cursor-grab rounded-2xl border-2 p-3 text-left shadow-2xl transition-transform hover:scale-105 active:cursor-grabbing ${STATUS_STYLES[status]} ${isCore ? 'ring-4 ring-amber-500/10' : ''}`}>
                <span className="block truncate text-sm font-black">{node.title}</span>
                <span className="mt-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider opacity-60"><span>{STATUS_LABELS[status]}</span>{node.sourceUrl && <ExternalLink size={11} />}</span>
              </button>
            })}
          </div>
        ) : viewMode === 'list' ? (
          <div className={`mx-auto grid max-w-6xl gap-4 p-4 lg:p-6 ${selected ? 'sm:pr-[390px]' : ''}`}>
            {LIST_GROUPS.map(group => {
              const nodes = projects.nodes.filter(node => (node.status ?? 'idea') === group.status)
              return <section key={group.status} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
                <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-800 text-amber-300">{group.icon}</span><h2 className="font-black">{group.title}</h2><span className="ml-auto rounded-full bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-400">{nodes.length}</span></div>
                {nodes.length ? <div className="divide-y divide-slate-800/70">{nodes.map(node => {
                  const progress = completionFor(node)
                  return <article key={node.id} className={`p-4 transition ${selectedId === node.id ? 'bg-amber-500/10' : 'hover:bg-slate-800/30'}`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleNodeDone(node.id)} aria-label={node.status === 'done' ? 'Réactiver la carte' : 'Cocher la carte'} className={`mt-0.5 flex-none ${node.status === 'done' ? 'text-emerald-400' : 'text-slate-600'}`}>{node.status === 'done' ? <CheckSquare2 size={21} /> : <Square size={21} />}</button>
                      <button onClick={() => setSelectedId(node.id)} className="min-w-0 flex-1 text-left"><span className={`block text-base font-black ${node.status === 'done' ? 'text-slate-500 line-through' : 'text-white'}`}>{node.title}</span><span className="mt-1 block whitespace-pre-wrap text-xs leading-relaxed text-slate-500">{node.notes || 'Aucun détail pour le moment.'}</span></button>
                      <div className="flex items-center gap-2"><span className="text-xs font-black tabular-nums text-amber-300">{progress}%</span>{node.sourceUrl && <a href={node.sourceUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-amber-500/10 p-2 text-amber-400" title="Ouvrir le document Drive"><ExternalLink size={15} /></a>}</div>
                    </div>
                    <div className="ml-8 mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400" style={{ width: `${progress}%` }} /></div>
                    <div className="ml-8 mt-2 flex flex-wrap gap-1.5 text-[9px] font-bold text-slate-500">{node.startDate && <span className="rounded-full bg-slate-800 px-2 py-1">Début {new Date(`${node.startDate}T12:00`).toLocaleDateString('fr-FR')}</span>}{node.dueDate && <span className="rounded-full bg-slate-800 px-2 py-1">Fin {new Date(`${node.dueDate}T12:00`).toLocaleDateString('fr-FR')}</span>}{(node.tags ?? []).map(tag => <span key={tag} className="rounded-full bg-slate-800 px-2 py-1">#{tag}</span>)}</div>
                    <div className="ml-8 mt-3 space-y-1.5">{(node.tasks ?? []).map(task => <div key={task.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                      <button onClick={() => toggleTask(node.id, task.id)} className={task.done ? 'text-emerald-400' : 'text-slate-600'}>{task.done ? <CheckSquare2 size={17} /> : <Square size={17} />}</button>
                      <button onClick={() => setSelectedId(node.id)} className={`min-w-0 flex-1 text-left text-xs font-bold ${task.done ? 'text-slate-600 line-through' : 'text-slate-300'}`}>{task.title}</button>
                      {(task.startDate || task.dueDate) && <span className="text-[9px] text-slate-600">{task.dueDate ?? task.startDate}</span>}
                      {task.sourceUrl && <a href={task.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400"><Link2 size={13} /></a>}
                    </div>)}<button onClick={() => { addTask(node.id); setSelectedId(node.id) }} className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-black text-amber-400"><Plus size={12} /> Ajouter une tâche</button></div>
                  </article>
                })}</div> : <p className="px-4 py-5 text-xs italic text-slate-600">Aucune carte dans cette catégorie.</p>}
              </section>
            })}
          </div>
        ) : (
          <GanttView projects={projects} onSelectNode={setSelectedId} onToggleTask={toggleTask} onToggleNode={toggleNodeDone} />
        )}

        {selected && <aside className="fixed inset-x-3 bottom-[76px] z-[80] max-h-[72vh] overflow-auto rounded-3xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-4 sm:top-28 sm:bottom-auto sm:w-[360px]">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Détail de la carte</p><h2 className="mt-1 text-xl font-black text-white">{selected.title}</h2></div><button onClick={() => setSelectedId(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-800"><X size={18} /></button></div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">{selectedParent && <button onClick={() => setSelectedId(selectedParent.id)} className="rounded-full bg-slate-800 px-2.5 py-1">Sous {selectedParent.title}</button>}<span className="rounded-full bg-slate-800 px-2.5 py-1">{selectedChildren.length} branche{selectedChildren.length > 1 ? 's' : ''}</span></div>
          <label className="mt-4 block text-xs font-bold text-slate-400">Titre<input value={selected.title} onChange={event => updateNode({ title: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-base font-bold text-white outline-none focus:border-amber-500" /></label>
          <label className="mt-3 block text-xs font-bold text-slate-400">État<select value={selected.status ?? 'idea'} onChange={event => updateNode({ status: event.target.value as ProjectStatus })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-white"><option value="idea">Idée</option><option value="active">En cours</option><option value="paused">En pause</option><option value="done">Archivé</option></select></label>
          <div className="mt-3 grid grid-cols-2 gap-2"><label className="block text-xs font-bold text-slate-400">Début<input type="date" value={selected.startDate ?? ''} onChange={event => updateNode({ startDate: event.target.value || undefined })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-2.5 text-xs text-white outline-none focus:border-amber-500" /></label><label className="block text-xs font-bold text-slate-400">Échéance<input type="date" value={selected.dueDate ?? ''} onChange={event => updateNode({ dueDate: event.target.value || undefined })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-2.5 text-xs text-white outline-none focus:border-amber-500" /></label></div>
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3"><div className="flex items-center justify-between text-xs font-bold"><span className="text-slate-500">Avancement calculé</span><span className="text-amber-300">{completionFor(selected)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400" style={{ width: `${completionFor(selected)}%` }} /></div></div>
          <label className="mt-3 block text-xs font-bold text-slate-400">Détail<textarea value={selected.notes ?? ''} onChange={event => updateNode({ notes: event.target.value })} rows={5} className="mt-1 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm leading-relaxed text-white outline-none focus:border-amber-500" /></label>
          <label className="mt-3 block text-xs font-bold text-slate-400">Google Doc ou fichier Drive associé<input value={selected.sourceUrl ?? ''} onChange={event => updateNode({ sourceUrl: event.target.value.trim() || undefined })} inputMode="url" placeholder="https://docs.google.com/…" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-xs text-white outline-none focus:border-amber-500" /></label>
          {selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-black text-amber-300"><ExternalLink size={14} /> Ouvrir le document associé</a>}
          <label className="mt-3 block text-xs font-bold text-slate-400">Étiquettes<input value={(selected.tags ?? []).join(', ')} onChange={event => updateNode({ tags: event.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })} placeholder="maison, travail…" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-amber-500" /></label>
          <section className="mt-4 border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between"><div><p className="text-xs font-black text-white">Liste des tâches</p><p className="text-[9px] text-slate-600">Coches et liens synchronisés sur Drive</p></div><button onClick={() => addTask(selected.id)} className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-2 text-[10px] font-black text-slate-950"><Plus size={12} /> Tâche</button></div>
            <div className="mt-3 space-y-2">{(selected.tasks ?? []).map(task => <div key={task.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-2.5">
              <div className="flex items-center gap-2"><button onClick={() => toggleTask(selected.id, task.id)} className={task.done ? 'text-emerald-400' : 'text-slate-600'}>{task.done ? <CheckSquare2 size={18} /> : <Square size={18} />}</button><input value={task.title} onChange={event => updateTask(selected.id, task.id, { title: event.target.value })} className={`min-w-0 flex-1 bg-transparent text-xs font-bold outline-none ${task.done ? 'text-slate-600 line-through' : 'text-white'}`} /><button onClick={() => deleteTask(selected.id, task.id)} className="text-slate-700 hover:text-red-400"><Trash2 size={13} /></button></div>
              <div className="mt-2 grid grid-cols-2 gap-1.5"><input type="date" aria-label="Début de tâche" value={task.startDate ?? ''} onChange={event => updateTask(selected.id, task.id, { startDate: event.target.value || undefined })} className="min-w-0 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-[10px] text-slate-400" /><input type="date" aria-label="Fin de tâche" value={task.dueDate ?? ''} onChange={event => updateTask(selected.id, task.id, { dueDate: event.target.value || undefined })} className="min-w-0 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-[10px] text-slate-400" /></div>
              <div className="mt-1.5 flex gap-1.5"><input value={task.sourceUrl ?? ''} onChange={event => updateTask(selected.id, task.id, { sourceUrl: event.target.value || undefined })} inputMode="url" placeholder="Lien Google Drive / Doc" className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-[10px] text-slate-400 outline-none focus:border-amber-500" />{task.sourceUrl && <a href={task.sourceUrl} target="_blank" rel="noopener noreferrer" className="grid w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-400"><ExternalLink size={13} /></a>}</div>
            </div>)}{!(selected.tasks?.length) && <p className="rounded-xl border border-dashed border-slate-800 px-3 py-4 text-center text-[10px] text-slate-600">Aucune tâche. Ajoute la première pour alimenter la liste et le Gantt.</p>}</div>
          </section>
          {selectedChildren.length > 0 && <div className="mt-4"><p className="text-xs font-bold text-slate-400">Branches</p><div className="mt-2 flex flex-wrap gap-1.5">{selectedChildren.map(child => <button key={child.id} onClick={() => setSelectedId(child.id)} className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-slate-300">{child.title}</button>)}</div></div>}
          <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => addNode(selected)} className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-3 text-sm font-black text-slate-950"><Plus size={16} /> Branche</button><button onClick={() => setSelectedId(null)} className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-3 text-sm font-bold"><Save size={16} /> Fermer</button></div>
          <button onClick={deleteNode} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400"><Trash2 size={14} /> Supprimer cette carte</button>
          {selected.status === 'done' && <p className="mt-3 flex items-center gap-2 text-[10px] text-emerald-400"><Archive size={13} /> Cette carte apparaît dans les archives de la vue Liste.</p>}
        </aside>}
      </div>
    </div>
  )
}
