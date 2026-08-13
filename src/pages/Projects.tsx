import { Archive, ExternalLink, GitBranch, LayoutList, Network, Orbit, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { ProjectNode, ProjectsData } from '../cloud/lifeHub'
import { LIFE_HUB_PROJECTS_IMPORTED_EVENT, loadProjectsSnapshot, saveProjectsData } from '../cloud/moduleStorage'

type ViewMode = 'map' | 'list'
type ProjectStatus = NonNullable<ProjectNode['status']>

const EMPTY_PROJECTS: ProjectsData = { nodes: [], edges: [], activeViewId: 'main' }
const VIEW_KEY = 'life_hub_projects_view_v1'
const RADIAL_LAYOUT_KEY = 'life_hub_projects_radial_v1'
const CANVAS_WIDTH = 1400
const CANVAS_HEIGHT = 820
const NODE_HALF_WIDTH = 88
const NODE_HALF_HEIGHT = 36

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
  try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'map' } catch { return 'map' }
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
        ) : (
          <div className={`mx-auto grid max-w-6xl gap-4 p-4 lg:p-6 ${selected ? 'sm:pr-[390px]' : ''}`}>
            {LIST_GROUPS.map(group => {
              const nodes = projects.nodes.filter(node => (node.status ?? 'idea') === group.status)
              return <section key={group.status} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
                <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-800 text-amber-300">{group.icon}</span><h2 className="font-black">{group.title}</h2><span className="ml-auto rounded-full bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-400">{nodes.length}</span></div>
                {nodes.length ? <div className="divide-y divide-slate-800/70">{nodes.map(node => <button key={node.id} onClick={() => setSelectedId(node.id)} className={`flex w-full items-start gap-3 p-4 text-left transition hover:bg-slate-800/50 ${selectedId === node.id ? 'bg-amber-500/10' : ''}`}>
                  <span className="mt-1 h-3 w-3 flex-none rounded-full" style={{ backgroundColor: node.color ?? '#f59e0b' }} />
                  <span className="min-w-0 flex-1"><span className="block font-black text-white">{node.title}</span><span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-slate-500">{node.notes || 'Aucun détail pour le moment.'}</span><span className="mt-2 flex flex-wrap gap-1">{(node.tags ?? []).slice(0, 4).map(tag => <span key={tag} className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-400">#{tag}</span>)}</span></span>
                  {node.sourceUrl && <ExternalLink size={15} className="mt-1 flex-none text-amber-400" />}
                </button>)}</div> : <p className="px-4 py-5 text-xs italic text-slate-600">Aucune carte dans cette catégorie.</p>}
              </section>
            })}
          </div>
        )}

        {selected && <aside className="fixed inset-x-3 bottom-[76px] z-[80] max-h-[72vh] overflow-auto rounded-3xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-4 sm:top-28 sm:bottom-auto sm:w-[360px]">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Détail de la carte</p><h2 className="mt-1 text-xl font-black text-white">{selected.title}</h2></div><button onClick={() => setSelectedId(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-800"><X size={18} /></button></div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">{selectedParent && <button onClick={() => setSelectedId(selectedParent.id)} className="rounded-full bg-slate-800 px-2.5 py-1">Sous {selectedParent.title}</button>}<span className="rounded-full bg-slate-800 px-2.5 py-1">{selectedChildren.length} branche{selectedChildren.length > 1 ? 's' : ''}</span></div>
          <label className="mt-4 block text-xs font-bold text-slate-400">Titre<input value={selected.title} onChange={event => updateNode({ title: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-base font-bold text-white outline-none focus:border-amber-500" /></label>
          <label className="mt-3 block text-xs font-bold text-slate-400">État<select value={selected.status ?? 'idea'} onChange={event => updateNode({ status: event.target.value as ProjectStatus })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-white"><option value="idea">Idée</option><option value="active">En cours</option><option value="paused">En pause</option><option value="done">Archivé</option></select></label>
          <label className="mt-3 block text-xs font-bold text-slate-400">Détail<textarea value={selected.notes ?? ''} onChange={event => updateNode({ notes: event.target.value })} rows={5} className="mt-1 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm leading-relaxed text-white outline-none focus:border-amber-500" /></label>
          <label className="mt-3 block text-xs font-bold text-slate-400">Google Doc ou fichier Drive associé<input value={selected.sourceUrl ?? ''} onChange={event => updateNode({ sourceUrl: event.target.value.trim() || undefined })} inputMode="url" placeholder="https://docs.google.com/…" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-xs text-white outline-none focus:border-amber-500" /></label>
          {selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-black text-amber-300"><ExternalLink size={14} /> Ouvrir le document associé</a>}
          <label className="mt-3 block text-xs font-bold text-slate-400">Étiquettes<input value={(selected.tags ?? []).join(', ')} onChange={event => updateNode({ tags: event.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })} placeholder="maison, travail…" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-amber-500" /></label>
          {selectedChildren.length > 0 && <div className="mt-4"><p className="text-xs font-bold text-slate-400">Branches</p><div className="mt-2 flex flex-wrap gap-1.5">{selectedChildren.map(child => <button key={child.id} onClick={() => setSelectedId(child.id)} className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-slate-300">{child.title}</button>)}</div></div>}
          <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => addNode(selected)} className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-3 text-sm font-black text-slate-950"><Plus size={16} /> Branche</button><button onClick={() => setSelectedId(null)} className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-3 text-sm font-bold"><Save size={16} /> Fermer</button></div>
          <button onClick={deleteNode} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400"><Trash2 size={14} /> Supprimer cette carte</button>
          {selected.status === 'done' && <p className="mt-3 flex items-center gap-2 text-[10px] text-emerald-400"><Archive size={13} /> Cette carte apparaît dans les archives de la vue Liste.</p>}
        </aside>}
      </div>
    </div>
  )
}
