import { Brain, Dumbbell, House, Network } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const MODULES = [
  { to: '/hub', label: 'Life Hub', icon: House },
  { to: '/', label: 'TRAINHARD', icon: Dumbbell },
  { to: '/presence', label: 'Présent', icon: Brain },
  { to: '/projets', label: 'Projets', icon: Network },
]

export function HubSwitcher() {
  return (
    <nav className="flex-shrink-0 border-b border-slate-800 bg-slate-950/95 px-2" aria-label="Applications Life Hub">
      <div className="mx-auto flex h-11 max-w-3xl items-stretch justify-center gap-1">
        {MODULES.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) =>
            `flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-t-lg border-b-2 px-2 text-xs font-bold transition-colors ${isActive ? 'border-indigo-400 bg-indigo-500/10 text-indigo-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`
          }>
            <Icon size={15} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
