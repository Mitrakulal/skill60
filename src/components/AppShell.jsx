import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

/**
 * AppShell — the layout wrapper for authenticated pages.
 * Sidebar on the left (260px), main content with cosmic glow on the right.
 */
export default function AppShell() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      {/* Main content area */}
      <div style={{
        flex: 1,
        marginLeft: '260px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        <TopBar />

        <main className="app-main" style={{
          flex: 1,
          padding: 'var(--spacing-8)',
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
