import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CalendarDays, TrendingUp, CheckCircle, XCircle, Upload } from 'lucide-react'

/**
 * Dashboard — Mentor home screen
 * 
 * PERF: Single consolidated fetch instead of 8 independent queries.
 * Data is fetched once and distributed to all cards.
 */
export default function Dashboard() {
  const { displayName } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    // Prevent double-fetch from React strict mode
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function fetchAll() {
      const today = new Date().toISOString().split('T')[0]

      // 3 parallel queries instead of 8 sequential ones
      const [sessionsRes, studentsRes, attendanceRes, importsRes] = await Promise.all([
        supabase.from('sessions').select('*').order('date', { ascending: false }),
        supabase.from('students').select('*').eq('is_active', true).order('name'),
        supabase.from('attendance').select('student_id, present, session_id, marked_at, sessions(topic, date)'),
        supabase.from('import_log').select('*').order('uploaded_at', { ascending: false }).limit(2),
      ])

      const sessions = sessionsRes.data || []
      const students = studentsRes.data || []
      const attendance = attendanceRes.data || []
      const imports = importsRes.data || []

      // Derive everything from these 3 datasets
      const totalSessions = sessions.length
      const activeStudents = students.length
      const presentCount = attendance.filter(a => a.present).length
      const overallPct = attendance.length > 0 ? ((presentCount / attendance.length) * 100).toFixed(1) : '—'
      const lastSession = sessions[0]?.date
        ? new Date(sessions[0].date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—'

      // Today's session
      const todaySession = sessions.find(s => s.date === today) || null

      // Today's attendance
      let todayAttendance = null
      if (todaySession) {
        const todayAtt = attendance.filter(a => a.session_id === todaySession.id)
        const todayPresent = todayAtt.filter(a => a.present).length
        const absent = todayAtt.filter(a => !a.present).map(a => {
          const student = students.find(s => s.id === a.student_id)
          return student?.name
        }).filter(Boolean)
        todayAttendance = {
          present: todayPresent,
          total: activeStudents,
          absent,
          hasAtt: todayAtt.length > 0,
        }
      }

      // Per-student breakdown
      const byStudent = {}
      attendance.forEach(a => {
        if (!byStudent[a.student_id]) {
          const student = students.find(s => s.id === a.student_id)
          byStudent[a.student_id] = { name: student?.name || 'Unknown', p: 0, t: 0 }
        }
        byStudent[a.student_id].t++
        if (a.present) byStudent[a.student_id].p++
      })
      const studentList = Object.values(byStudent)
      const highest = [...studentList].sort((a, b) => (b.p / b.t) - (a.p / a.t))[0] || null
      const lowest = [...studentList].sort((a, b) => (a.p / a.t) - (b.p / b.t))[0] || null

      // Recent activity (deduped by session)
      const seen = new Set()
      const recentAtt = attendance
        .filter(a => a.marked_at)
        .sort((a, b) => new Date(b.marked_at) - new Date(a.marked_at))
        .filter(a => { if (seen.has(a.session_id)) return false; seen.add(a.session_id); return true })
        .slice(0, 3)
        .map(a => ({ icon: 'check', text: `Attendance marked for "${a.sessions?.topic}"`, time: a.marked_at }))
      const recentImports = imports.map(i => ({
        icon: 'upload', text: `CSV imported: ${i.filename} — ${i.imported_rows} records`, time: i.uploaded_at,
      }))
      const activities = [...recentAtt, ...recentImports]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 5)

      setData({
        stats: [
          { label: 'Total Sessions', value: totalSessions },
          { label: 'Overall Attendance', value: `${overallPct}%` },
          { label: 'Active Students', value: activeStudents },
          { label: 'Last Session', value: lastSession },
        ],
        todaySession,
        todayAttendance,
        overview: { totalSessions, avgPct: overallPct, highest, lowest },
        activities,
      })
    }

    fetchAll()
  }, [])

  if (!data) {
    return (
      <div>
        <div style={{ marginBottom: 'var(--spacing-8)' }}>
          <h1 className="text-display-hero" style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)', marginBottom: 'var(--spacing-2)' }}>
            Welcome Back, {displayName?.split(' ')[0] || 'Mentor'}
          </h1>
          <p className="text-body-lg" style={{ color: 'var(--color-fg-secondary)' }}>
            Loading your dashboard...
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--spacing-6)', marginTop: 'var(--spacing-6)' }}>
          {[1, 2, 3, 4].map(i => <Skel key={i} label="Loading..." />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: 'var(--spacing-8)' }}>
        <h1 className="text-display-hero" style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)', marginBottom: 'var(--spacing-2)' }}>
          Welcome Back, {displayName?.split(' ')[0] || 'Mentor'}
        </h1>
        <p className="text-body-lg" style={{ color: 'var(--color-fg-secondary)' }}>
          Here's what's happening at The Forge today.
        </p>
      </div>

      {/* Stat Strip */}
      <div style={{ display: 'flex', gap: 'var(--spacing-8)', padding: 'var(--spacing-4) var(--spacing-6)', background: 'var(--color-surface)', backgroundImage: 'var(--card-gradient)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)', overflowX: 'auto' }}>
        {data.stats.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', borderLeft: i > 0 ? '1px solid var(--color-border-subtle)' : 'none', paddingLeft: i > 0 ? 'var(--spacing-8)' : '0', whiteSpace: 'nowrap' }}>
            <div>
              <p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>{s.label}</p>
              <p className="text-body-lg" style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--spacing-6)', marginTop: 'var(--spacing-6)' }}>
        {/* Today's Session */}
        <div className="card-hero">
          <p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-2)' }}>Today's Session</p>
          {data.todaySession ? (
            <>
              <h2 className="text-h2" style={{ marginBottom: 'var(--spacing-4)' }}>{data.todaySession.topic}</h2>
              <div style={{ display: 'flex', gap: 'var(--spacing-6)', marginBottom: 'var(--spacing-6)' }}>
                <div><p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>Duration</p><p className="text-body-lg" style={{ fontWeight: 600 }}>{data.todaySession.duration_hours} hrs</p></div>
                <div><p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>Type</p><p className="text-body-lg" style={{ fontWeight: 600, textTransform: 'capitalize' }}>{data.todaySession.session_type}</p></div>
              </div>
              <button className="btn-primary" onClick={() => navigate('/attendance')}><CheckCircle size={16} /> Mark Attendance</button>
            </>
          ) : (
            <div style={{ padding: 'var(--spacing-6) 0' }}>
              <p className="text-body-lg" style={{ color: 'var(--color-fg-secondary)', marginBottom: 'var(--spacing-4)' }}>No session scheduled for today.</p>
              <button className="btn-primary" onClick={() => navigate('/attendance')}>Create Session</button>
            </div>
          )}
        </div>

        {/* Today's Attendance */}
        <div className="card-hero">
          <p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-2)' }}>Today's Attendance</p>
          {!data.todayAttendance || !data.todayAttendance.hasAtt ? (
            <div style={{ padding: 'var(--spacing-6) 0' }}>
              <p className="text-body-lg" style={{ color: 'var(--color-fg-secondary)', marginBottom: 'var(--spacing-4)' }}>{!data.todayAttendance ? 'No session today.' : 'Not yet marked.'}</p>
              {data.todayAttendance && <button className="btn-primary" onClick={() => navigate('/attendance')}><CheckCircle size={16} /> Mark Now</button>}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-4)' }}>
                <span className="text-display-md">{data.todayAttendance.present}/{data.todayAttendance.total}</span>
                <span className="pill pill-success" style={{ fontSize: '11px' }}>{data.todayAttendance.total > 0 ? ((data.todayAttendance.present / data.todayAttendance.total) * 100).toFixed(0) : 0}%</span>
              </div>
              <div style={{ height: '8px', background: 'var(--color-surface-inset)', borderRadius: 'var(--radius-full)', marginBottom: 'var(--spacing-4)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${data.todayAttendance.total > 0 ? (data.todayAttendance.present / data.todayAttendance.total) * 100 : 0}%`, background: 'var(--color-success)', borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease' }} />
              </div>
              {data.todayAttendance.absent.length > 0 && (
                <div>
                  <p className="text-caption" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-2)' }}>Absent:</p>
                  {data.todayAttendance.absent.slice(0, 5).map((n, i) => <span key={i} className="text-body-sm" style={{ color: 'var(--color-danger)', marginRight: 'var(--spacing-3)' }}>{n}</span>)}
                  {data.todayAttendance.absent.length > 5 && <span className="text-body-sm" style={{ color: 'var(--color-fg-tertiary)' }}>and {data.todayAttendance.absent.length - 5} more</span>}
                </div>
              )}
            </>
          )}
        </div>

        {/* Program Overview */}
        <div className="card">
          <p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-2)' }}>Program Overview</p>
          <h3 className="text-h2" style={{ marginBottom: 'var(--spacing-6)' }}>Overview</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
            <SI icon={CalendarDays} label="Total Sessions" value={data.overview.totalSessions} />
            <SI icon={TrendingUp} label="Avg Attendance" value={`${data.overview.avgPct}%`} />
            <SI icon={CheckCircle} label="Highest" value={data.overview.highest?.name || '—'} sub={data.overview.highest ? `${((data.overview.highest.p / data.overview.highest.t) * 100).toFixed(0)}%` : ''} color="var(--color-success)" />
            <SI icon={XCircle} label="Lowest" value={data.overview.lowest?.name || '—'} sub={data.overview.lowest ? `${((data.overview.lowest.p / data.overview.lowest.t) * 100).toFixed(0)}%` : ''} color="var(--color-danger)" />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-2)' }}>Recent Activity</p>
          <h3 className="text-h2" style={{ marginBottom: 'var(--spacing-6)' }}>Activity</h3>
          {data.activities.length === 0 ? <p className="text-body" style={{ color: 'var(--color-fg-tertiary)' }}>No recent activity.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              {data.activities.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-3)', paddingBottom: i < data.activities.length - 1 ? 'var(--spacing-4)' : 0, borderBottom: i < data.activities.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                  {a.icon === 'check' ? <CheckCircle size={16} style={{ color: 'var(--color-success)', marginTop: '2px', flexShrink: 0 }} /> : <Upload size={16} style={{ color: 'var(--color-info)', marginTop: '2px', flexShrink: 0 }} />}
                  <div><p className="text-body-sm">{a.text}</p><p className="text-caption" style={{ color: 'var(--color-fg-tertiary)', marginTop: '2px' }}>{timeAgo(a.time)}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SI({ icon: Icon, label, value, sub, color }) {
  return (<div><div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><Icon size={14} style={{ color: color || 'var(--color-fg-tertiary)' }} /><span className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>{label}</span></div><p className="text-body" style={{ fontWeight: 600, color: color || 'var(--color-fg-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>{sub && <span className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>{sub}</span>}</div>)
}
function Skel({ label }) {
  return (<div className="card" style={{ minHeight: '200px' }}><p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-2)' }}>{label}</p><div style={{ height: '24px', width: '60%', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-4)', animation: 'pulse 1.5s infinite' }} /><div style={{ height: '16px', width: '40%', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s infinite' }} /></div>)
}
function timeAgo(d) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; const dy = Math.floor(h / 24); if (dy < 30) return `${dy}d ago`; return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) }
