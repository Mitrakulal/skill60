import { CheckCircle, AlertTriangle, X, Zap } from 'lucide-react'

/**
 * Dev Tokens page — throwaway test page to verify design system tokens.
 * Renders: one card, one button, one input, and status pills (success + danger).
 * Route: /dev-tokens
 * 
 * DELETE THIS PAGE before shipping. It exists only for P0 gate verification.
 */
export default function DevTokens() {
  return (
    <div className="app-main" style={{ padding: 'var(--spacing-12)' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 'var(--spacing-12)' }}>
        <p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-2)' }}>
          Design System
        </p>
        <h1 className="text-display-lg" style={{ color: 'var(--color-fg-primary)' }}>
          Token Test Page
        </h1>
        <p className="text-body-lg" style={{ color: 'var(--color-fg-secondary)', marginTop: 'var(--spacing-3)' }}>
          Verify that design tokens, fonts, and components render correctly.
        </p>
      </div>

      {/* Grid of test components */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 'var(--spacing-6)',
        maxWidth: '1200px',
      }}>

        {/* ── Card Test ── */}
        <div className="card">
          <p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-2)' }}>
            Today's Session
          </p>
          <h2 className="text-h2" style={{ marginBottom: 'var(--spacing-4)' }}>
            8-Layer AI Application Stack
          </h2>
          <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center', marginBottom: 'var(--spacing-6)' }}>
            <span className="pill pill-success">
              <CheckCircle size={14} />
              86% Present
            </span>
            <span className="pill pill-danger">
              <X size={14} />
              5 Absent
            </span>
          </div>

          {/* Mini stat row */}
          <div style={{
            display: 'flex',
            gap: 'var(--spacing-8)',
            paddingTop: 'var(--spacing-4)',
            borderTop: '1px solid var(--color-border-subtle)',
          }}>
            <div>
              <p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>Duration</p>
              <p className="text-body-lg" style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>2.0 hrs</p>
            </div>
            <div>
              <p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>Type</p>
              <p className="text-body-lg" style={{ fontWeight: 600 }}>Offline</p>
            </div>
            <div>
              <p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>Month</p>
              <p className="text-body-lg" style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>4</p>
            </div>
          </div>
        </div>

        {/* ── Hero Card Test ── */}
        <div className="card-hero">
          <p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-2)' }}>
            Overall Attendance
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-3)' }}>
            <span className="text-display-md" style={{ color: 'var(--color-success)' }}>
              78.4%
            </span>
            <span className="pill pill-success" style={{ fontSize: '11px' }}>
              <Zap size={12} />
              +2.1%
            </span>
          </div>
          <p className="text-body-sm" style={{ color: 'var(--color-fg-secondary)', marginTop: 'var(--spacing-3)' }}>
            234 of 298 sessions attended across all students
          </p>
        </div>

        {/* ── Input + Button Test ── */}
        <div className="card">
          <p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-4)' }}>
            Form Components
          </p>

          <div style={{ marginBottom: 'var(--spacing-4)' }}>
            <label className="text-caption" style={{ color: 'var(--color-fg-secondary)', display: 'block', marginBottom: 'var(--spacing-2)' }}>
              Session Topic
            </label>
            <input
              className="input"
              type="text"
              placeholder="e.g., ReAct Agent Pattern"
            />
          </div>

          <div style={{ marginBottom: 'var(--spacing-6)' }}>
            <label className="text-caption" style={{ color: 'var(--color-fg-secondary)', display: 'block', marginBottom: 'var(--spacing-2)' }}>
              Student USN
            </label>
            <input
              className="input"
              type="text"
              placeholder="4SH24CS001"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            <button className="btn-primary">
              <CheckCircle size={16} />
              Save
            </button>
            <button className="btn-secondary">Cancel</button>
            <button className="btn-danger">
              <AlertTriangle size={16} />
              Delete
            </button>
          </div>
        </div>

        {/* ── Status Pills Collection ── */}
        <div className="card">
          <p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-4)' }}>
            Status Indicators
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-6)' }}>
            <span className="pill pill-success"><CheckCircle size={14} /> Present</span>
            <span className="pill pill-danger"><X size={14} /> Absent</span>
            <span className="pill pill-warning"><AlertTriangle size={14} /> Warning</span>
            <span className="pill pill-info"><Zap size={14} /> Imported</span>
          </div>

          {/* Typography showcase */}
          <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--spacing-4)' }}>
            <p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-3)' }}>
              Typography
            </p>
            <p className="text-h1">Heading 1 — Satoshi</p>
            <p className="text-h2" style={{ color: 'var(--color-fg-secondary)' }}>Heading 2</p>
            <p className="text-h3" style={{ color: 'var(--color-fg-secondary)' }}>Heading 3</p>
            <p className="text-body">Body text in Inter — The quick brown fox</p>
            <p className="text-body-sm" style={{ color: 'var(--color-fg-secondary)' }}>Body small — secondary text</p>
            <p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>Caption — meta info</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-fg-secondary)', marginTop: 'var(--spacing-2)' }}>
              USN: 4SH24CS045 — JetBrains Mono
            </p>
          </div>
        </div>
      </div>

      {/* ── Stat Strip / Ticker Test ── */}
      <div style={{
        display: 'flex',
        gap: 'var(--spacing-8)',
        marginTop: 'var(--spacing-8)',
        padding: 'var(--spacing-4) var(--spacing-6)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-card)',
        overflowX: 'auto',
      }}>
        {[
          { label: 'Total Sessions', value: '42' },
          { label: 'Overall Attendance', value: '78.4%' },
          { label: 'Active Students', value: '36' },
          { label: 'Last Session', value: 'Apr 30, 2026' },
        ].map((stat, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-3)',
            borderLeft: i > 0 ? '1px solid var(--color-border-subtle)' : 'none',
            paddingLeft: i > 0 ? 'var(--spacing-8)' : '0',
            whiteSpace: 'nowrap',
          }}>
            <div>
              <p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>{stat.label}</p>
              <p className="text-body-lg" style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
