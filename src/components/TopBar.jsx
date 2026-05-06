import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Search } from 'lucide-react'

/**
 * Breadcrumb map — maps route paths to display labels.
 */
const breadcrumbMap = {
  '/dashboard':     { section: 'Overview', page: 'Dashboard' },
  '/attendance':    { section: 'Activity', page: 'Mark Attendance' },
  '/history':       { section: 'Activity', page: 'Student History' },
  '/materials':     { section: 'Activity', page: 'Materials' },
  '/upload':        { section: 'Data',     page: 'Upload CSV' },
  '/me/attendance': { section: 'Portal',   page: 'My Attendance' },
  '/me/upcoming':   { section: 'Portal',   page: 'Upcoming' },
  '/me/materials':  { section: 'Portal',   page: 'Materials' },
}

export default function TopBar() {
  const { displayName } = useAuth()
  const location = useLocation()

  const crumb = breadcrumbMap[location.pathname] || { section: '', page: '' }
  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--spacing-4) var(--spacing-8)',
      borderBottom: '1px solid var(--color-border-subtle)',
      background: 'var(--color-canvas)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Left: Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
        <span className="text-caption" style={{ color: 'var(--color-fg-secondary)' }}>
          {crumb.section}
        </span>
        {crumb.section && (
          <span className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>
            /
          </span>
        )}
        <span className="text-caption" style={{ color: 'var(--color-fg-primary)' }}>
          {crumb.page}
        </span>
      </div>

      {/* Right: Search + User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
        {/* Search placeholder */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-2)',
          padding: '8px 14px',
          background: 'var(--color-surface-inset)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-md)',
          width: '220px',
        }}>
          <Search size={16} style={{ color: 'var(--color-fg-tertiary)' }} />
          <span className="text-body-sm" style={{ color: 'var(--color-fg-tertiary)' }}>
            Search...
          </span>
        </div>

        {/* User avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <div style={{
            width: '36px', height: '36px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border-default)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="text-caption" style={{
              color: 'var(--color-fg-primary)',
              fontWeight: 600,
            }}>
              {initials}
            </span>
          </div>
          <span className="text-body-sm" style={{ color: 'var(--color-fg-primary)', fontWeight: 500 }}>
            {displayName}
          </span>
        </div>
      </div>
    </header>
  )
}
