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
    <nav className="min-w-0 flex-1 border-b border-slate-600 bg-slate-800/95 px-2 lg:border-b-0 lg:border-r" aria-label="Applications Life Hub">
      <div className="mx-auto flex h-14 max-w-4xl items-stretch justify-center gap-1">
        {MODULES.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) =>
            `flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border-b-2 px-2 text-xs font-bold transition-colors ${isActive ? 'border-indigo-300 bg-indigo-500/25 text-white' : 'border-transparent text-slate-200 hover:bg-slate-700 hover:text-white'}`
          }>
            <Icon size={15} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
