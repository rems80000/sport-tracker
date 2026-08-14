import { ArrowRight, Brain, CheckCircle2, Cloud, Download, Dumbbell, Network, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { loadPresenceSnapshot, loadProjectsSnapshot } from '../cloud/moduleStorage'
import { useInstallApp } from '../pwa/installContext'
import { useDriveSync } from '../store/driveSyncContext'
import { useStore } from '../store/useStore'

export function HubHome() {
  const { state } = useStore()
  const drive = useDriveSync()
  const appInstall = useInstallApp()
  const presence = loadPresenceSnapshot().data
  const projects = loadProjectsSnapshot().data
  const lastSport = state.sessions.filter(session => session.status === 'done' || session.status === 'done_short').sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0]

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#1e293b_0,#07101d_48%,#030712_100%)] px-4 py-7 text-slate-100 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-300">Remy Life Hub</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Votre espace, sans dispersion.</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Bouger, respirer et faire avancer vos projets depuis une seule application.</p>
        {!appInstall.installed && (
          <section className="mt-6 flex flex-col gap-4 rounded-3xl border border-blue-400/25 bg-gradient-to-r from-blue-600/20 via-indigo-600/15 to-slate-900/70 p-4 shadow-2xl shadow-blue-950/20 sm:flex-row sm:items-center sm:p-5">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-950/50"><Smartphone size={24} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white">Life Hub sur Android</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Icône sur l’écran d’accueil, plein écran, mises à jour automatiques et données Google Drive conservées.</p>
            </div>
            {appInstall.canInstall ? (
              <button onClick={() => void appInstall.install()} className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-xs font-black text-white active:scale-95"><Download size={16} /> Installer l’application</button>
            ) : (
              <p className="rounded-xl bg-slate-950/60 px-4 py-3 text-center text-[11px] font-bold text-blue-200">{appInstall.isAndroid ? 'Chrome ⋮ → Installer l’application' : 'Ouvre cette page dans Chrome sur Android'}</p>
            )}
          </section>
        )}
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <ModuleCard to="/" icon={Dumbbell} title="TRAINHARD" eyebrow="Corps" color="indigo" description={lastSport ? `Dernière séance : ${new Date(lastSport.date).toLocaleDateString('fr-FR')}` : 'Votre programme sportif maison'} metric={`${state.sessions.length} séances enregistrées`} />
          <ModuleCard to="/presence" icon={Brain} title="Présent" eyebrow="Esprit" color="emerald" description="Méditations guidées, respiration et ambiances" metric={`${presence.history.length} séances méditées`} />
          <ModuleCard to="/projets" icon={Network} title="Projets" eyebrow="Direction" color="amber" description="Le futur mind mapping de tous vos projets" metric={projects.nodes.length ? `${projects.nodes.length} idées structurées` : 'Structure prête à accueillir vos cartes'} />
        </div>
        <section className="mt-6 rounded-2xl border border-slate-700/50 bg-slate-900/70 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${drive.status === 'synced' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}`}>{drive.status === 'synced' ? <CheckCircle2 size={20} /> : <Cloud size={20} />}</span>
            <div className="min-w-0 flex-1"><p className="font-bold">Sauvegarde commune Google Drive</p><p className="truncate text-xs text-slate-500">TRAINHARD · Présent · Projets dans remy-life-hub.json</p></div>
            <Link to="/parametres" className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Gérer</Link>
          </div>
        </section>
      </div>
    </div>
  )
}

function ModuleCard({ to, icon: Icon, title, eyebrow, description, metric, color }: { to: string; icon: typeof Dumbbell; title: string; eyebrow: string; description: string; metric: string; color: 'indigo' | 'emerald' | 'amber' }) {
  const styles = { indigo: 'from-indigo-500/25 border-indigo-500/30 text-indigo-300', emerald: 'from-emerald-500/25 border-emerald-500/30 text-emerald-300', amber: 'from-amber-500/25 border-amber-500/30 text-amber-300' }[color]
  return <Link to={to} className={`group min-h-56 rounded-3xl border bg-gradient-to-br ${styles} to-slate-950 p-5 shadow-xl transition-transform hover:-translate-y-1`}><div className="flex items-start justify-between"><Icon size={28} /><ArrowRight size={18} className="opacity-50 transition-transform group-hover:translate-x-1" /></div><p className="mt-8 text-[10px] font-bold uppercase tracking-[0.22em] opacity-70">{eyebrow}</p><h2 className="mt-1 text-2xl font-black text-white">{title}</h2><p className="mt-2 text-sm text-slate-400">{description}</p><p className="mt-5 text-xs font-bold opacity-80">{metric}</p></Link>
}
