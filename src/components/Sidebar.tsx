import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Dumbbell, History, TrendingUp, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../store/useStore'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/programme', icon: BookOpen, label: 'Programme' },
  { to: '/seance', icon: Dumbbell, label: 'Séance' },
  { to: '/historique', icon: History, label: 'Historique' },
  { to: '/progression', icon: TrendingUp, label: 'Progrès' },
  { to: '/parametres', icon: Settings, label: 'Réglages' },
]

export function Sidebar() {
  const { state, dispatch } = useStore()
  const compact = state.sidebarCompact ?? false

  return (
    <aside
      className={`hidden lg:flex flex-col bg-slate-900/95 border-r border-slate-700/40 flex-shrink-0 transition-all duration-200 ${compact ? 'w-[64px]' : 'w-[200px]'}`}
    >
      <nav className="flex flex-col gap-1 p-2 pt-4 flex-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${compact ? 'justify-center' : ''}
              ${isActive
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-200 active:bg-slate-800'
              }`
            }
            title={compact ? label : undefined}
          >
            <Icon size={20} strokeWidth={1.75} className="flex-shrink-0" />
            {!compact && <span className="text-sm font-semibold leading-none">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bouton réduire/agrandir */}
      <button
        onClick={() => dispatch({ type: 'SET_SIDEBAR_COMPACT', payload: !compact })}
        className={`mx-2 mb-4 py-2 px-3 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 transition-colors flex items-center gap-2 ${compact ? 'justify-center' : ''}`}
        title={compact ? 'Agrandir le menu' : 'Réduire le menu'}
      >
        {compact ? <ChevronRight size={16} /> : <><ChevronLeft size={14} /><span className="text-xs font-medium">Réduire</span></>}
      </button>
    </aside>
  )
}
