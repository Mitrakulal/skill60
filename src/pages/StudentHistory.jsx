import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, User, CheckCircle, XCircle, Minus } from 'lucide-react'

export default function StudentHistory() {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    supabase.from('students').select('*').eq('is_active', true).order('name')
      .then(({ data }) => setStudents(data || []))
    supabase.from('sessions').select('*').order('date', { ascending: true })
      .then(({ data }) => setSessions(data || []))
  }, [])

  useEffect(() => {
    if (!selected) { setAttendance([]); return }
    supabase.from('attendance').select('*, sessions(*)').eq('student_id', selected.id)
      .then(({ data }) => setAttendance(data || []))
  }, [selected])

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.usn.toLowerCase().includes(search.toLowerCase())
  )

  // Stats
  const totalSessions = sessions.length
  const attended = attendance.filter(a => a.present).length
  const pct = totalSessions > 0 ? ((attended / totalSessions) * 100).toFixed(1) : '—'
  const pctNum = parseFloat(pct) || 0
  const pctColor = pctNum >= 75 ? 'var(--color-success)' : pctNum >= 60 ? 'var(--color-warning)' : 'var(--color-danger)'

  // Streak calculation
  const sortedAtt = [...attendance].sort((a, b) => new Date(a.sessions?.date) - new Date(b.sessions?.date))
  let currentStreak = 0, longestStreak = 0, streak = 0
  sortedAtt.forEach(a => {
    if (a.present) { streak++; longestStreak = Math.max(longestStreak, streak) }
    else { streak = 0 }
  })
  currentStreak = streak

  // Heatmap — 7 cols
  const attMap = {}
  attendance.forEach(a => { if (a.sessions) attMap[a.sessions.date] = a.present })

  return (
    <div>
      <h1 className="text-h1" style={{ marginBottom: 'var(--spacing-6)' }}>Student History</h1>

      {/* Search combobox */}
      <div style={{ position: 'relative', marginBottom: 'var(--spacing-6)', maxWidth: '500px' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-fg-tertiary)' }} />
        <input className="input" placeholder="Search student by name or USN..."
          value={search} onChange={e => { setSearch(e.target.value); if (selected) setSelected(null) }}
          style={{ paddingLeft: '42px' }} />
        {search && !selected && filtered.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
            background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-md)', marginTop: '4px', maxHeight: '240px', overflowY: 'auto',
            boxShadow: 'var(--shadow-raised)',
          }}>
            {filtered.map(s => (
              <div key={s.id} onClick={() => { setSelected(s); setSearch(s.name) }} style={{
                padding: 'var(--spacing-3) var(--spacing-4)', cursor: 'pointer', display: 'flex',
                justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span className="text-body">{s.name}</span>
                <span className="text-caption" style={{ color: 'var(--color-fg-tertiary)', fontFamily: 'var(--font-mono)' }}>{s.usn}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <>
          {/* 2-up: profile + heatmap */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--spacing-6)', marginBottom: 'var(--spacing-6)' }}>
            {/* Profile card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={24} style={{ color: 'var(--color-fg-secondary)' }} />
                </div>
                <div>
                  <h2 className="text-display-sm">{selected.name}</h2>
                  <p className="text-caption" style={{ color: 'var(--color-fg-tertiary)', fontFamily: 'var(--font-mono)' }}>{selected.usn} · {selected.branch_code} · {selected.batch}</p>
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: 'var(--spacing-4) 0' }}>
                <p className="text-display-md" style={{ color: pctColor, fontVariantNumeric: 'tabular-nums' }}>{pct}%</p>
                <p className="text-body-sm" style={{ color: 'var(--color-fg-secondary)', marginTop: 'var(--spacing-2)' }}>{attended} of {totalSessions} sessions</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--spacing-6)', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--spacing-4)' }}>
                <div style={{ textAlign: 'center' }}><p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>Current Streak</p><p className="text-body-lg" style={{ fontWeight: 600 }}>{currentStreak}</p></div>
                <div style={{ textAlign: 'center' }}><p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>Longest Streak</p><p className="text-body-lg" style={{ fontWeight: 600 }}>{longestStreak}</p></div>
              </div>
            </div>

            {/* Heatmap */}
            <div className="card">
              <p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-4)' }}>Attendance Grid</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {sessions.map(s => {
                  const status = attMap[s.date]
                  const bg = status === true ? 'var(--color-success-bg)' : status === false ? 'var(--color-danger-bg)' : 'var(--color-surface-inset)'
                  const border = status === true ? 'var(--color-success-border)' : status === false ? 'var(--color-danger-border)' : 'transparent'
                  const d = new Date(s.date)
                  return (
                    <div key={s.id} title={`${s.date} — ${s.topic}`} style={{
                      width: '32px', height: '32px', borderRadius: 'var(--radius-md)',
                      background: bg, border: `1px solid ${border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'default',
                    }}>
                      <span className="text-micro" style={{ color: 'var(--color-fg-tertiary)', fontSize: '9px' }}>{d.getDate()}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)' }} /><span className="text-micro" style={{ color: 'var(--color-fg-tertiary)' }}>Present</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)' }} /><span className="text-micro" style={{ color: 'var(--color-fg-tertiary)' }}>Absent</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--color-surface-inset)' }} /><span className="text-micro" style={{ color: 'var(--color-fg-tertiary)' }}>No Record</span></div>
              </div>
            </div>
          </div>

          {/* Session table */}
          <div className="card" style={{ padding: 0 }}>
            <table className="ft-table">
              <thead><tr><th>Date</th><th>Topic</th><th>Status</th><th>Duration</th></tr></thead>
              <tbody>
                {sessions.map(s => {
                  const att = attMap[s.date]
                  return (
                    <tr key={s.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>{s.topic}</td>
                      <td>
                        {att === true ? <span className="pill pill-success"><CheckCircle size={12} /> Present</span>
                          : att === false ? <span className="pill pill-danger"><XCircle size={12} /> Absent</span>
                          : <span className="pill" style={{ background: 'var(--color-surface-inset)', color: 'var(--color-fg-tertiary)', border: '1px solid var(--color-border-subtle)' }}><Minus size={12} /> No Record</span>}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{s.duration_hours} hrs</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
