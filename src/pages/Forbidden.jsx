import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ShieldX, ArrowLeft } from 'lucide-react'

/**
 * 403 Forbidden page — shown when a user tries to access a route they don't have permission for.
 */
export default function Forbidden() {
  const { role } = useAuth()
  const navigate = useNavigate()

  const homeRoute = role === 'mentor' ? '/dashboard' : '/me/attendance'

  return (
    <div className="app-main" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: 'var(--spacing-6)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-danger-bg)',
          marginBottom: 'var(--spacing-6)',
        }}>
          <ShieldX size={32} style={{ color: 'var(--color-danger)' }} />
        </div>

        <h1 className="text-display-sm" style={{ marginBottom: 'var(--spacing-3)' }}>
          403
        </h1>
        <h2 className="text-h2" style={{
          color: 'var(--color-fg-secondary)',
          marginBottom: 'var(--spacing-4)',
        }}>
          Access Denied
        </h2>
        <p className="text-body-lg" style={{
          color: 'var(--color-fg-tertiary)',
          marginBottom: 'var(--spacing-8)',
        }}>
          You don't have permission to access this page.
          Please contact your mentor if you believe this is an error.
        </p>

        <button
          className="btn-primary"
          onClick={() => navigate(homeRoute, { replace: true })}
          style={{ height: '48px', fontSize: '16px' }}
        >
          <ArrowLeft size={18} />
          Return to {role === 'mentor' ? 'Dashboard' : 'My Attendance'}
        </button>
      </div>
    </div>
  )
}
