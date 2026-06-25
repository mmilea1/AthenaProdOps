import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Features', path: '/features' },
  { label: 'Goals', path: '/goals' },
  { label: 'Flags', path: '/flags' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Settings', path: '/settings' },
]

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.9" />
      <rect x="11" y="1" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.9" />
      <rect x="1" y="11" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.9" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.9" />
    </svg>
  )
}

export function Header() {
  return (
    <header style={{ backgroundColor: '#2D1B69' }} className="shrink-0 h-16">
      <div className="max-w-7xl mx-auto px-8 h-full flex items-center">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <GridIcon />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            athena ProdOps
          </span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1 ml-10">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  'px-4 py-1.5 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-white/70 font-medium hover:text-white hover:bg-white/10',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="flex items-center gap-2.5 ml-auto">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
            style={{ backgroundColor: '#7C3AED' }}
          >
            MM
          </div>
          <span className="text-white/80 text-sm">marco milea</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/50">
            <path d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </header>
  )
}
