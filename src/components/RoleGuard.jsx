import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * RoleGuard — wraps routes to enforce role-based access.
 * 
 * Usage:
 *   <Route element={<RoleGuard allowed="mentor" />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 * 
 * If loading: shows skeleton
 * If not logged in: redirects to /login
 * If wrong role: redirects to /403
 */
export default function RoleGuard({ allowed, children }) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-main" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="text-h2" style={{ color: 'var(--color-fg-primary)' }}>
            Loading...
          </div>
          <p className="text-body-sm" style={{ color: 'var(--color-fg-secondary)', marginTop: 'var(--spacing-3)' }}>
            Authenticating your session
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowed && role !== allowed) {
    return <Navigate to="/403" replace />
  }

  return children
}
