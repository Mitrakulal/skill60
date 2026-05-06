import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CalendarDays, Users, TrendingUp, CheckCircle, XCircle, Upload } from 'lucide-react'

export default function Dashboard() {
  const { displayName } = useAuth()
  const navigate = useNavigate()

  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-8)' }}>
        <h1 className="text-display-hero" style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)', marginBottom: 'var(--spacing-2)' }}>
          Welcome Back, {displayName?.split(' ')[0] || 'Mentor'}
        </h1>
        <p className="text-body-lg" style={{ color: 'var(--color-fg-secondary)' }}>
          Here's what's happening at The Forge today.
        </p>
      </div>
      <StatStrip />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--spacing-6)', marginTop: 'var(--spacing-6)' }}>
        <TodaySessionCard navigate={navigate} />
        <TodayAttendanceCard navigate={navigate} />
        <ProgramOverviewCard />
        <RecentActivityCard />
      </div>
    </div>
  )
}

function StatStrip() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    async function f() {
      const [sr, st, ar] = await Promise.all([
        supabase.from('sessions').select('id, date').order('date', { ascending: false }),
        supabase.from('students').select('id').eq('is_active', true),
        supabase.from('attendance').select('present'),
      ])
      const total = sr.data?.length || 0
      const active = st.data?.length || 0
      const all = ar.data || []
      const pres = all.filter(a => a.present).length
      const pct = all.length > 0 ? ((pres / all.length) * 100).toFixed(1) : '—'
      const last = sr.data?.[0]?.date ? new Date(sr.data[0].date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
      setStats([
        { label: 'Total Sessions', value: total },
        { label: 'Overall Attendance', value: `${pct}%` },
        { label: 'Active Students', value: active },
        { label: 'Last Session', value: last },
      ])
    }
    f()
  }, [])

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-8)', padding: 'var(--spacing-4) var(--spacing-6)', background: 'var(--color-surface)', backgroundImage: 'var(--card-gradient)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)', overflowX: 'auto' }}>
      {(stats || Array(4).fill({ label: '—', value: '—' })).map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', borderLeft: i > 0 ? '1px solid var(--color-border-subtle)' : 'none', paddingLeft: i > 0 ? 'var(--spacing-8)' : '0', whiteSpace: 'nowrap' }}>
          <div>
            <p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>{s.label}</p>
            <p className="text-body-lg" style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function TodaySessionCard({ navigate }) {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    supabase.from('sessions').select('*').eq('date', new Date().toISOString().split('T')[0]).maybeSingle().then(({ data }) => setSession(data))
  }, [])
  if (session === undefined) return <Skel label="Today's Session" />
  return (
    <div className="card-hero">
      <p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-2)' }}>Today's Session</p>
      {session ? (
        <>
          <h2 className="text-h2" style={{ marginBottom: 'var(--spacing-4)' }}>{session.topic}</h2>
          <div style={{ display: 'flex', gap: 'var(--spacing-6)', marginBottom: 'var(--spacing-6)' }}>
            <div><p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>Duration</p><p className="text-body-lg" style={{ fontWeight: 600 }}>{session.duration_hours} hrs</p></div>
            <div><p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>Type</p><p className="text-body-lg" style={{ fontWeight: 600, textTransform: 'capitalize' }}>{session.session_type}</p></div>
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
  )
}

function TodayAttendanceCard({ navigate }) {
  const [data, setData] = useState(undefined)
  useEffect(() => {
    async function f() {
      const today = new Date().toISOString().split('T')[0]
      const { data: sess } = await supabase.from('sessions').select('id').eq('date', today).maybeSingle()
      if (!sess) { setData(null); return }
      const [attRes, stRes] = await Promise.all([
        supabase.from('attendance').select('present, students(name)').eq('session_id', sess.id),
        supabase.from('students').select('id').eq('is_active', true),
      ])
      const att = attRes.data || []
      const pres = att.filter(a => a.present).length
      const total = stRes.data?.length || 0
      const absent = att.filter(a => !a.present).map(a => a.students?.name).filter(Boolean)
      setData({ pres, total, absent, hasAtt: att.length > 0 })
    }
    f()
  }, [])
  if (data === undefined) return <Skel label="Today's Attendance" />
  return (
    <div className="card-hero">
      <p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-2)' }}>Today's Attendance</p>
      {!data || !data.hasAtt ? (
        <div style={{ padding: 'var(--spacing-6) 0' }}>
          <p className="text-body-lg" style={{ color: 'var(--color-fg-secondary)', marginBottom: 'var(--spacing-4)' }}>{!data ? 'No session today.' : 'Not yet marked.'}</p>
          {data && <button className="btn-primary" onClick={() => navigate('/attendance')}><CheckCircle size={16} /> Mark Now</button>}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-4)' }}>
            <span className="text-display-md">{data.pres}/{data.total}</span>
            <span className="pill pill-success" style={{ fontSize: '11px' }}>{data.total > 0 ? ((data.pres / data.total) * 100).toFixed(0) : 0}%</span>
          </div>
          <div style={{ height: '8px', background: 'var(--color-surface-inset)', borderRadius: 'var(--radius-full)', marginBottom: 'var(--spacing-4)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${data.total > 0 ? (data.pres / data.total) * 100 : 0}%`, background: 'var(--color-success)', borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease' }} />
          </div>
          {data.absent.length > 0 && (
            <div>
              <p className="text-caption" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-2)' }}>Absent:</p>
              {data.absent.slice(0, 5).map((n, i) => <span key={i} className="text-body-sm" style={{ color: 'var(--color-danger)', marginRight: 'var(--spacing-3)' }}>{n}</span>)}
              {data.absent.length > 5 && <span className="text-body-sm" style={{ color: 'var(--color-fg-tertiary)' }}>and {data.absent.length - 5} more</span>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProgramOverviewCard() {
  const [data, setData] = useState(undefined)
  useEffect(() => {
    async function f() {
      const [sr, ar] = await Promise.all([
        supabase.from('sessions').select('id'),
        supabase.from('attendance').select('student_id, present, students(name)'),
      ])
      const totalSess = sr.data?.length || 0
      const att = ar.data || []
      const pct = att.length > 0 ? ((att.filter(a => a.present).length / att.length) * 100).toFixed(1) : '—'
      const byS = {}
      att.forEach(a => { if (!byS[a.student_id]) byS[a.student_id] = { name: a.students?.name, p: 0, t: 0 }; byS[a.student_id].t++; if (a.present) byS[a.student_id].p++ })
      const list = Object.values(byS)
      const hi = [...list].sort((a, b) => (b.p / b.t) - (a.p / a.t))[0]
      const lo = [...list].sort((a, b) => (a.p / a.t) - (b.p / b.t))[0]
      setData({ totalSess, pct, hi, lo })
    }
    f()
  }, [])
  if (data === undefined) return <Skel label="Program Overview" />
  return (
    <div className="card">
      <p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-2)' }}>Program Overview</p>
      <h3 className="text-h2" style={{ marginBottom: 'var(--spacing-6)' }}>Overview</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
        <SI icon={CalendarDays} label="Total Sessions" value={data.totalSess} />
        <SI icon={TrendingUp} label="Avg Attendance" value={`${data.pct}%`} />
        <SI icon={CheckCircle} label="Highest" value={data.hi?.name || '—'} sub={data.hi ? `${((data.hi.p / data.hi.t) * 100).toFixed(0)}%` : ''} color="var(--color-success)" />
        <SI icon={XCircle} label="Lowest" value={data.lo?.name || '—'} sub={data.lo ? `${((data.lo.p / data.lo.t) * 100).toFixed(0)}%` : ''} color="var(--color-danger)" />
      </div>
    </div>
  )
}

function RecentActivityCard() {
  const [acts, setActs] = useState(undefined)
  useEffect(() => {
    async function f() {
      const { data: ra } = await supabase.from('attendance').select('marked_at, session_id, sessions(topic)').order('marked_at', { ascending: false }).limit(20)
      const seen = new Set()
      const ai = (ra || []).filter(a => { if (seen.has(a.session_id)) return false; seen.add(a.session_id); return true }).slice(0, 3).map(a => ({ icon: 'check', text: `Attendance marked for "${a.sessions?.topic}"`, time: a.marked_at }))
      const { data: ri } = await supabase.from('import_log').select('*').order('uploaded_at', { ascending: false }).limit(2)
      const ii = (ri || []).map(i => ({ icon: 'upload', text: `CSV imported: ${i.filename} — ${i.imported_rows} records`, time: i.uploaded_at }))
      setActs([...ai, ...ii].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5))
    }
    f()
  }, [])
  if (acts === undefined) return <Skel label="Recent Activity" />
  return (
    <div className="card">
      <p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-2)' }}>Recent Activity</p>
      <h3 className="text-h2" style={{ marginBottom: 'var(--spacing-6)' }}>Activity</h3>
      {acts.length === 0 ? <p className="text-body" style={{ color: 'var(--color-fg-tertiary)' }}>No recent activity.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {acts.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-3)', paddingBottom: i < acts.length - 1 ? 'var(--spacing-4)' : 0, borderBottom: i < acts.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
              {a.icon === 'check' ? <CheckCircle size={16} style={{ color: 'var(--color-success)', marginTop: '2px', flexShrink: 0 }} /> : <Upload size={16} style={{ color: 'var(--color-info)', marginTop: '2px', flexShrink: 0 }} />}
              <div><p className="text-body-sm">{a.text}</p><p className="text-caption" style={{ color: 'var(--color-fg-tertiary)', marginTop: '2px' }}>{timeAgo(a.time)}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SI({ icon: Icon, label, value, sub, color }) {
  return (<div><div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><Icon size={14} style={{ color: color || 'var(--color-fg-tertiary)' }} /><span className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>{label}</span></div><p className="text-body" style={{ fontWeight: 600, color: color || 'var(--color-fg-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>{sub && <span className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>{sub}</span>}</div>)
}
function Skel({ label }) {
  return (<div className="card" style={{ minHeight: '200px' }}><p className="text-label" style={{ color: 'var(--color-fg-tertiary)', marginBottom: 'var(--spacing-2)' }}>{label}</p><div style={{ height: '24px', width: '60%', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-4)' }} /><div style={{ height: '16px', width: '40%', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)' }} /></div>)
}
function timeAgo(d) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; const dy = Math.floor(h / 24); if (dy < 30) return `${dy}d ago`; return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) }
