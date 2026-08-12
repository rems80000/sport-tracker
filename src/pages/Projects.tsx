import { ExternalLink, GitBranch, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { ProjectNode, ProjectsData } from '../cloud/lifeHub'
import { LIFE_HUB_PROJECTS_IMPORTED_EVENT, loadProjectsSnapshot, saveProjectsData } from '../cloud/moduleStorage'

const EMPTY_PROJECTS: ProjectsData = { nodes: [], edges: [], activeViewId: 'main' }
const STATUS_LABELS = { idea: 'Idée', active: 'En cours', paused: 'En pause', done: 'Terminé' }
const STATUS_STYLES = {
  idea: 'border-slate-600 bg-slate-800 text-slate-200',
  active: 'border-amber-500/60 bg-amber-500/15 text-amber-200',
  paused: 'border-blue-500/50 bg-blue-500/10 text-blue-200',
  done: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200',
}

function normalizedProjects(): ProjectsData {
  const data = loadProjectsSnapshot().data
  return { ...EMPTY_PROJECTS, ...data, nodes: data.nodes ?? [], edges: data.edges ?? [] }
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

export function Projects() {
  const [projects, setProjects] = useState<ProjectsData>(normalizedProjects)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState('')
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const projectsRef = useRef(projects)
  const selected = projects.nodes.find(node => node.id === selectedId)

  useEffect(() => { projectsRef.current = projects }, [projects])
  useEffect(() => {
    const refresh = () => setProjects(normalizedProjects())
    window.addEventListener(LIFE_HUB_PROJECTS_IMPORTED_EVENT, refresh)
    return () => window.removeEventListener(LIFE_HUB_PROJECTS_IMPORTED_EVENT, refresh)
  }, [])

  function persist(next: ProjectsData) {
    projectsRef.current = next
    setProjects(next)
    saveProjectsData(next)
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
        ? { x: parent.position.x + 230, y: parent.position.y + ((index % 3) - 1) * 115 }
        : { x: 55 + (index % 3) * 220, y: 70 + Math.floor(index / 3) * 120 },
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
      const nodeIds = new Set(projects.nodes.map(node => node.id))
      const edgeIds = new Set(projects.edges.map(edge => edge.id))
      const newNodes = imported.nodes.filter(node => !nodeIds.has(node.id))
      const knownNodeIds = new Set([...nodeIds, ...newNodes.map(node => node.id)])
      const newEdges = imported.edges.filter(edge => !edgeIds.has(edge.id) && knownNodeIds.has(edge.sourceId) && knownNodeIds.has(edge.targetId))
      persist({ ...projects, nodes: [...projects.nodes, ...newNodes], edges: [...projects.edges, ...newEdges] })
      setImportMessage(newNodes.length ? `${newNodes.length} cartes ajoutées et synchronisées.` : 'Toutes ces cartes sont déjà présentes.')
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
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-4 lg:px-8">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">Projets & MindMap</p>
          <h1 className="truncate text-xl font-black sm:text-2xl">Clarifier, relier, avancer.</h1>
        </div>
        <span className="text-xs text-slate-500">{projects.nodes.length} nœud{projects.nodes.length > 1 ? 's' : ''} · sauvegarde automatique</span>
        <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={importProjects} />
        <button onClick={() => importRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-black text-amber-300"><Upload size={17} /> Importer des cartes</button>
        <button onClick={() => addNode()} className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950"><Plus size={17} /> Ajouter une idée</button>
      </header>

      {importMessage && <button onClick={() => setImportMessage('')} className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-left text-xs font-bold text-amber-200 lg:px-8">{importMessage} <span className="ml-2 opacity-60">×</span></button>}

      <div className="relative flex-1 overflow-auto">
        <div ref={canvasRef} onPointerMove={moveNode} onPointerUp={finishDrag} onPointerCancel={finishDrag}
          className="relative h-[calc(100vh-12rem)] min-h-[520px] min-w-[900px] overflow-hidden bg-[radial-gradient(circle_at_1px_1px,#334155_1px,transparent_0)] [background-size:24px_24px]">
          {projects.nodes.length === 0 && <div className="absolute inset-0 grid place-items-center p-6 text-center"><div><GitBranch className="mx-auto text-amber-400" size={42} /><h2 className="mt-4 text-2xl font-black">Posez votre première idée</h2><p className="mt-2 text-sm text-slate-500">Créez un projet central, puis ajoutez ses branches.</p><button onClick={() => addNode()} className="mt-5 rounded-xl bg-amber-500 px-5 py-3 font-black text-slate-950">Créer le premier nœud</button></div></div>}

          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {projects.edges.map(edge => {
              const source = projects.nodes.find(node => node.id === edge.sourceId)
              const target = projects.nodes.find(node => node.id === edge.targetId)
              if (!source || !target) return null
              return <line key={edge.id} x1={(source.position?.x ?? 0) + 88} y1={(source.position?.y ?? 0) + 36} x2={(target.position?.x ?? 0) + 88} y2={(target.position?.y ?? 0) + 36} stroke="#64748b" strokeWidth="2" strokeDasharray={edge.kind === 'reference' ? '5 5' : undefined} />
            })}
          </svg>

          {projects.nodes.map(node => {
            const status = node.status ?? 'idea'
            return <button key={node.id} onPointerDown={event => startDrag(event, node)} onDoubleClick={() => setSelectedId(node.id)}
              style={{ left: node.position?.x ?? 40, top: node.position?.y ?? 40, borderColor: selectedId === node.id ? node.color : undefined }}
              className={`absolute w-44 touch-none cursor-grab rounded-2xl border-2 p-3 text-left shadow-2xl active:cursor-grabbing ${STATUS_STYLES[status]}`}>
              <span className="block truncate text-sm font-black">{node.title}</span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider opacity-60">{STATUS_LABELS[status]}</span>
            </button>
          })}
        </div>

        {selected && <aside className="absolute inset-x-3 bottom-3 z-20 max-h-[75%] overflow-auto rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-auto sm:w-80">
          <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest text-amber-400">Modifier le nœud</p><button onClick={() => setSelectedId(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-800"><X size={17} /></button></div>
          <label className="mt-4 block text-xs font-bold text-slate-400">Titre<input value={selected.title} onChange={event => updateNode({ title: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-base font-bold text-white outline-none focus:border-amber-500" /></label>
          <label className="mt-3 block text-xs font-bold text-slate-400">État<select value={selected.status ?? 'idea'} onChange={event => updateNode({ status: event.target.value as ProjectNode['status'] })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-white"><option value="idea">Idée</option><option value="active">En cours</option><option value="paused">En pause</option><option value="done">Terminé</option></select></label>
          <label className="mt-3 block text-xs font-bold text-slate-400">Notes<textarea value={selected.notes ?? ''} onChange={event => updateNode({ notes: event.target.value })} rows={3} className="mt-1 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-amber-500" /></label>
          {selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300"><ExternalLink size={14} /> Ouvrir la note Keep source</a>}
          <label className="mt-3 block text-xs font-bold text-slate-400">Étiquettes<input value={(selected.tags ?? []).join(', ')} onChange={event => updateNode({ tags: event.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })} placeholder="maison, travail…" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-amber-500" /></label>
          <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => addNode(selected)} className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-3 text-sm font-black text-slate-950"><Plus size={16} /> Branche</button><button onClick={() => setSelectedId(null)} className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-3 text-sm font-bold"><Save size={16} /> Fermer</button></div>
          <button onClick={deleteNode} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400"><Trash2 size={14} /> Supprimer ce nœud</button>
        </aside>}
      </div>
    </div>
  )
}
