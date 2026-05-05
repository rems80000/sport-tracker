import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Dumbbell, History, TrendingUp, Settings, PanelLeftClose, PanelLeft, Sun } from 'lucide-react'
import { useStore } from '../store/useStore'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/programme', icon: BookOpen, label: 'Programme' },
  { to: '/seance', icon: Dumbbell, label: 'Séance' },
  { to: '/historique', icon: History, label: 'Historique' },
  { to: '/progression', icon: TrendingUp, label: 'Progrès' },
  { to: '/vacances', icon: Sun, label: 'Vacances' },
  { to: '/parametres', icon: Settings, label: 'Réglages' },
]

export function Sidebar() {
  const { state, dispatch } = useStore()
  const compact = state.sidebarCompact ?? false

  return (
    <aside
      className={`hidden lg:flex flex-col bg-slate-900/95 border-r border-slate-700/40 flex-shrink-0 transition-all duration-200 ${compact ? 'w-[64px]' : 'w-[220px]'}`}
    >
      {/* Bouton toggle en haut — toujours visible */}
      <button
        onClick={() => dispatch({ type: 'SET_SIDEBAR_COMPACT', payload: !compact })}
        className={`flex items-center gap-2.5 mx-2 mt-3 mb-1 px-3 py-2.5 rounded-xl transition-colors bg-slate-800/60 border border-slate-700/30 hover:bg-slate-700/60 hover:border-slate-600/50 active:scale-95 ${compact ? 'justify-center' : ''}`}
        title={compact ? 'Agrandir le menu' : 'Réduire le menu'}
      >
        {compact
          ? <PanelLeft size={18} className="text-slate-400 flex-shrink-0" />
          : <>
              <PanelLeftClose size={18} className="text-slate-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-400">Réduire</span>
            </>
        }
      </button>

      <div className="mx-2 mb-2 h-px bg-slate-700/40" />

      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${compact ? 'justify-center' : ''}
              ${isActive
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-200 active:bg-slate-800 border border-transparent'
              }`
            }
            title={compact ? label : undefined}
          >
            <Icon size={20} strokeWidth={1.75} className="flex-shrink-0" />
            {!compact && <span className="text-sm font-semibold leading-none">{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
