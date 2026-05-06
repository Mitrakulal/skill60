import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, CheckSquare, Users, BookOpen,
  Upload, UserCheck, Calendar, Settings, LogOut, Anvil, X, Menu,
} from 'lucide-react'
import { useState } from 'react'

const mentorNav = [
  { label: 'Overview', items: [
    { to: '/dashboard', icon: LayoutDashboard, text: 'Dashboard' },
  ]},
  { label: 'Activity', items: [
    { to: '/attendance', icon: CheckSquare, text: 'Mark Attendance' },
    { to: '/history', icon: Users, text: 'Student History' },
    { to: '/materials', icon: BookOpen, text: 'Materials' },
  ]},
  { label: 'Data', items: [
    { to: '/upload', icon: Upload, text: 'Upload CSV' },
  ]},
]

const studentNav = [
  { label: 'My Portal', items: [
    { to: '/me/attendance', icon: UserCheck, text: 'My Attendance' },
    { to: '/me/upcoming', icon: Calendar, text: 'Upcoming' },
    { to: '/me/materials', icon: BookOpen, text: 'Materials' },
  ]},
]

export default function Sidebar() {
  const { role, displayName, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navGroups = role === 'mentor' ? mentorNav : studentNav

  const sidebarContent = (
    <>
      {/* Logo & App Name */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--spacing-6)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <div style={{
            width: '32px', height: '32px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-glow-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Anvil size={18} style={{ color: 'var(--color-accent-glow)' }} />
          </div>
          <span className="text-h3">ForgeTrack</span>
        </div>
        {/* Mobile close button */}
        <button
          className="sidebar-mobile-close"
          onClick={() => setMobileOpen(false)}
          style={{
            display: 'none',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-fg-secondary)', padding: '4px',
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Welcome block */}
      <div style={{
        padding: 'var(--spacing-4) var(--spacing-6)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}>
        <p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>
          Welcome back
        </p>
        <p className="text-body" style={{ fontWeight: 600, marginTop: '2px' }}>
          {displayName || 'User'}
        </p>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: 'var(--spacing-4) var(--spacing-3)', overflowY: 'auto' }}>
        {navGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: 'var(--spacing-6)' }}>
            <p className="text-label" style={{
              color: 'var(--color-fg-tertiary)',
              padding: '0 var(--spacing-3)',
              marginBottom: 'var(--spacing-2)',
            }}>
              {group.label}
            </p>
            {group.items.map((item) => {
              const isActive = location.pathname === item.to ||
                (item.to !== '/' && location.pathname.startsWith(item.to))
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-3)',
                    padding: '0 var(--spacing-4)',
                    height: '44px',
                    borderRadius: 'var(--radius-lg)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? 'var(--color-fg-primary)' : 'var(--color-fg-secondary)',
                    background: isActive ? 'var(--color-surface-raised)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--color-accent-glow)' : '2px solid transparent',
                    transition: 'all 0.15s ease',
                    marginBottom: '2px',
                  }}
                >
                  <item.icon size={20} strokeWidth={1.75} />
                  {item.text}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: Account */}
      <div style={{
        padding: 'var(--spacing-4) var(--spacing-3)',
        borderTop: '1px solid var(--color-border-subtle)',
      }}>
        <p className="text-label" style={{
          color: 'var(--color-fg-tertiary)',
          padding: '0 var(--spacing-3)',
          marginBottom: 'var(--spacing-2)',
        }}>
          Account
        </p>
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-3)',
            padding: '0 var(--spacing-4)',
            height: '44px',
            borderRadius: 'var(--radius-lg)',
            border: 'none',
            background: 'transparent',
            color: 'var(--color-fg-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
            width: '100%',
            fontFamily: 'var(--font-body)',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => e.target.style.background = 'var(--color-surface)'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          <LogOut size={20} strokeWidth={1.75} />
          Logout
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger trigger */}
      <button
        className="sidebar-mobile-trigger"
        onClick={() => setMobileOpen(true)}
        style={{
          display: 'none',
          position: 'fixed', top: 'var(--spacing-4)', left: 'var(--spacing-4)',
          zIndex: 51,
          width: '44px', height: '44px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border-default)',
          color: 'var(--color-fg-primary)',
          cursor: 'pointer',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            display: 'none',
            position: 'fixed', inset: 0,
            background: 'rgba(7, 7, 11, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 59,
          }}
          className="sidebar-mobile-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}
        style={{
          width: '260px',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-canvas)',
          borderRight: '1px solid var(--color-border-subtle)',
          zIndex: 60,
          transition: 'transform 0.2s ease',
        }}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
