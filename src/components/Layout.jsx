import { NavLink, Outlet } from 'react-router-dom'
import { IconLayoutGrid, IconMap, IconUsers, IconLogout } from '@tabler/icons-react'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-sage-100 flex">
      <aside className="w-16 flex flex-col items-center gap-2 py-6 border-r border-sage-200/60">
        <NavItem to="/" icon={<IconLayoutGrid size={20} />} label="Trips" />
        <NavItem to="/hotels" icon={<IconMap size={20} />} label="Hotels" />
        {profile?.role === 'supervisor' && (
          <NavItem to="/team" icon={<IconUsers size={20} />} label="Team" />
        )}
        <button
          onClick={signOut}
          className="mt-auto w-10 h-10 rounded-full flex items-center justify-center text-ink-600 hover:bg-sage-200/60"
          title="Sign out"
        >
          <IconLogout size={20} />
        </button>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between px-8 py-5">
          <div>
            <p className="text-ink-600 text-sm">
              {profile?.role === 'supervisor' ? 'Supervisor' : 'Operator'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-forest-600 text-white flex items-center justify-center text-sm font-medium font-display">
            {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
        </header>

        <main className="flex-1 px-8 pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={label}
      className={({ isActive }) =>
        `w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          isActive ? 'bg-forest-600 text-white' : 'text-ink-600 hover:bg-sage-200/60'
        }`
      }
    >
      {icon}
    </NavLink>
  )
}
