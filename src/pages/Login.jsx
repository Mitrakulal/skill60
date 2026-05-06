import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Anvil, Mail, Hash, Eye, EyeOff, LogIn } from 'lucide-react'

/**
 * Login page — per Design System §11.1
 * Full-screen centered form, cosmic glow background.
 * Tab toggle: Mentor (email) / Student (USN)
 */
export default function Login() {
  const [mode, setMode] = useState('mentor') // 'mentor' | 'student'
  const [email, setEmail] = useState('')
  const [usn, setUsn] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const loginEmail = mode === 'mentor'
        ? email
        : `${usn.trim()}@forge.local`

      await login({ email: loginEmail.toLowerCase(), password })

      // Navigation happens via AuthContext → App re-render → route redirect
      // But we can also push explicitly:
      // Mentor → /dashboard, Student → /me/attendance
      // The RoleGuard + default redirect will handle this,
      // but let's be explicit for UX speed:
      if (mode === 'mentor') {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/me/attendance', { replace: true })
      }
    } catch (err) {
      console.error('Login failed:', err)
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid credentials. Please check your email/USN and password.')
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Account not confirmed. Contact your mentor.')
      } else {
        setError(err.message || 'Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-main" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: 'var(--spacing-6)',
    }}>
      <div className="card-hero" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '48px',
      }}>
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-8)' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-accent-glow-soft)',
            marginBottom: 'var(--spacing-4)',
          }}>
            <Anvil size={24} style={{ color: 'var(--color-accent-glow)' }} />
          </div>
          <h1 className="text-h2" style={{ marginBottom: 'var(--spacing-2)' }}>
            ForgeTrack
          </h1>
          <p className="text-body-sm" style={{ color: 'var(--color-fg-secondary)' }}>
            Attendance & Materials Tracker
          </p>
        </div>

        {/* Tab Toggle: Mentor / Student */}
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '4px',
          background: 'var(--color-surface-inset)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--spacing-6)',
        }}>
          {['mentor', 'student'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setMode(tab); setError('') }}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: mode === tab ? 'var(--color-surface-raised)' : 'transparent',
                color: mode === tab ? 'var(--color-fg-primary)' : 'var(--color-fg-secondary)',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab === 'mentor' ? 'Mentor Login' : 'Student Login'}
            </button>
          ))}
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Email or USN field */}
          <div style={{ marginBottom: 'var(--spacing-4)' }}>
            <label className="text-label" style={{
              color: 'var(--color-fg-secondary)',
              display: 'block',
              marginBottom: 'var(--spacing-2)',
            }}>
              {mode === 'mentor' ? 'Email Address' : 'University Seat Number (USN)'}
            </label>
            <div style={{ position: 'relative' }}>
              {mode === 'mentor' ? (
                <>
                  <Mail size={18} style={{
                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--color-fg-tertiary)',
                  }} />
                  <input
                    className="input"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    style={{ paddingLeft: '42px' }}
                  />
                </>
              ) : (
                <>
                  <Hash size={18} style={{
                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--color-fg-tertiary)',
                  }} />
                  <input
                    className="input"
                    type="text"
                    placeholder="4SH24CS001"
                    value={usn}
                    onChange={(e) => setUsn(e.target.value.toUpperCase())}
                    required
                    autoFocus
                    style={{ paddingLeft: '42px', fontFamily: 'var(--font-mono)' }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Password field */}
          <div style={{ marginBottom: 'var(--spacing-6)' }}>
            <label className="text-label" style={{
              color: 'var(--color-fg-secondary)',
              display: 'block',
              marginBottom: 'var(--spacing-2)',
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-fg-tertiary)', padding: '4px',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              padding: 'var(--spacing-3) var(--spacing-4)',
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--spacing-4)',
            }}>
              <p className="text-caption" style={{ color: 'var(--color-danger)' }}>
                {error}
              </p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', height: '48px', fontSize: '16px' }}
          >
            {loading ? (
              'Signing in...'
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Helper text */}
        {mode === 'student' && (
          <p className="text-caption" style={{
            color: 'var(--color-fg-tertiary)',
            textAlign: 'center',
            marginTop: 'var(--spacing-4)',
          }}>
            Default password is your USN. You'll be asked to change it on first login.
          </p>
        )}
      </div>
    </div>
  )
}
