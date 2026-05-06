import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import RoleGuard from './components/RoleGuard'
import AppShell from './components/AppShell'

// Pages
import Login from './pages/Login'
import Forbidden from './pages/Forbidden'
import Dashboard from './pages/Dashboard'
import MarkAttendance from './pages/MarkAttendance'
import StudentHistory from './pages/StudentHistory'
import Materials from './pages/Materials'
import DevTokens from './pages/DevTokens'

/**
 * Root redirect — sends users to the right home based on role.
 */
function HomeRedirect() {
  const { role, loading } = useAuth()
  if (loading) return null
  if (role === 'mentor') return <Navigate to="/dashboard" replace />
  if (role === 'student') return <Navigate to="/me/attendance" replace />
  return <Navigate to="/login" replace />
}

/**
 * Placeholder for student portal pages (built in P5)
 */
function Placeholder({ title }) {
  return (
    <div style={{ padding: 'var(--spacing-8)' }}>
      <h1 className="text-h1" style={{ marginBottom: 'var(--spacing-4)' }}>{title}</h1>
      <p className="text-body-lg" style={{ color: 'var(--color-fg-secondary)' }}>
        This screen will be built in a later phase.
      </p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/403" element={<Forbidden />} />
          <Route path="/dev-tokens" element={<DevTokens />} />

          {/* Root redirect */}
          <Route path="/" element={<HomeRedirect />} />

          {/* Mentor routes — wrapped in AppShell + RoleGuard */}
          <Route element={<RoleGuard allowed="mentor"><AppShell /></RoleGuard>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/attendance" element={<MarkAttendance />} />
            <Route path="/history" element={<StudentHistory />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/upload" element={<Placeholder title="Upload CSV" />} />
          </Route>

          {/* Student routes — wrapped in AppShell + RoleGuard */}
          <Route element={<RoleGuard allowed="student"><AppShell /></RoleGuard>}>
            <Route path="/me/attendance" element={<Placeholder title="My Attendance" />} />
            <Route path="/me/upcoming" element={<Placeholder title="Upcoming" />} />
            <Route path="/me/materials" element={<Placeholder title="Materials" />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
