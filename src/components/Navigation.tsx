import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Dumbbell, History, TrendingUp, Settings, Sun } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/programme', icon: BookOpen, label: 'Programme' },
  { to: '/seance', icon: Dumbbell, label: 'Séance' },
  { to: '/historique', icon: History, label: 'Historique' },
  { to: '/progression', icon: TrendingUp, label: 'Progrès' },
  { to: '/vacances', icon: Sun, label: 'Vacances' },
  { to: '/parametres', icon: Settings, label: 'Réglages' },
]

export function Navigation() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700/60 pb-safe">
      <div className="flex items-stretch max-w-2xl mx-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors min-h-[60px] ${
                isActive ? 'text-indigo-400' : 'text-slate-500 active:text-slate-300'
              }`
            }
          >
            <Icon size={20} strokeWidth={1.75} />
            <span className="leading-none">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
