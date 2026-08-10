import { GitBranch, Network, Sparkles, Tags } from 'lucide-react'
import { loadProjectsSnapshot } from '../cloud/moduleStorage'

export function Projects() {
  const projects = loadProjectsSnapshot().data
  return (
    <div className="min-h-full bg-[#090b12] px-5 py-8 text-slate-100 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">Prochain module</p>
        <h1 className="mt-2 text-4xl font-black">Projets & MindMap</h1>
        <p className="mt-3 max-w-2xl text-slate-400">La structure de données est déjà intégrée à Life Hub et à Google Drive. L’interface de cartographie viendra s’y brancher sans nouvelle migration.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Feature icon={Network} title="Nœuds positionnés" text="Idées, actions et sous-projets libres sur la carte." />
          <Feature icon={GitBranch} title="Relations typées" text="Parenté, dépendance ou simple référence." />
          <Feature icon={Tags} title="Pilotage" text="Statuts, couleurs, notes et étiquettes." />
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"><Sparkles className="text-amber-400" size={20} /><p className="text-sm"><b>{projects.nodes.length}</b> nœud enregistré · vue principale prête · synchronisation Drive prévue.</p></div>
      </div>
    </div>
  )
}

function Feature({ icon: Icon, title, text }: { icon: typeof Network; title: string; text: string }) {
  return <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><Icon className="text-amber-400" size={22} /><h2 className="mt-4 font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">{text}</p></article>
}
