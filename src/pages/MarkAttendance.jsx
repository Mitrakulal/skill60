import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CheckCircle, XCircle, Check, Save, AlertTriangle } from 'lucide-react'

export default function MarkAttendance() {
  const { displayName } = useAuth()
  const navigate = useNavigate()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [session, setSession] = useState(undefined)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [existingAttendance, setExistingAttendance] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [newTopic, setNewTopic] = useState('')
  const [newDuration, setNewDuration] = useState('2.0')
  const [newType, setNewType] = useState('offline')
  const [creatingSession, setCreatingSession] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const minDate = '2025-08-04'

  // Fetch session for selected date
  useEffect(() => {
    async function fetchSession() {
      setSession(undefined)
      const { data } = await supabase.from('sessions').select('*').eq('date', date).maybeSingle()
      setSession(data)
      if (data) fetchAttendance(data.id)
    }
    fetchSession()
  }, [date])

  // Fetch students
  useEffect(() => {
    async function fetchStudents() {
      const { data } = await supabase.from('students').select('*').eq('is_active', true).order('name')
      setStudents(data || [])
    }
    fetchStudents()
  }, [])

  async function fetchAttendance(sessionId) {
    const { data } = await supabase.from('attendance').select('student_id, present').eq('session_id', sessionId)
    if (data && data.length > 0) {
      const map = {}
      data.forEach(a => { map[a.student_id] = a.present })
      setAttendance(map)
      setExistingAttendance(true)
    } else {
      setAttendance({})
      setExistingAttendance(false)
    }
  }

  function toggleStudent(studentId) {
    setAttendance(prev => ({ ...prev, [studentId]: !prev[studentId] }))
  }

  function selectAll(present) {
    const map = {}
    students.forEach(s => { map[s.id] = present })
    setAttendance(map)
  }

  async function createSession() {
    if (!newTopic.trim()) return
    setCreatingSession(true)
    const monthNum = Math.ceil((new Date(date).getMonth() + 1 - 7) % 12) || 1
    const { data, error } = await supabase.from('sessions').insert({
      date, topic: newTopic.trim(), month_number: monthNum,
      duration_hours: parseFloat(newDuration), session_type: newType,
    }).select().single()
    if (error) { alert('Failed to create session: ' + error.message); setCreatingSession(false); return }
    setSession(data)
    setCreatingSession(false)
  }

  const presentCount = Object.values(attendance).filter(Boolean).length
  const absentCount = students.length - presentCount

  async function saveAttendance() {
    if (!session) return
    setSaving(true)
    const rows = students.map(s => ({
      student_id: s.id, session_id: session.id,
      present: attendance[s.id] || false,
      marked_by: displayName || 'mentor',
    }))
    const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,session_id' })
    setSaving(false)
    setShowConfirm(false)
    if (error) { alert('Failed to save: ' + error.message); return }
    navigate('/dashboard')
  }

  function handleSave() {
    if (existingAttendance) { setShowConfirm(true) } else { saveAttendance() }
  }

  return (
    <div>
      <h1 className="text-h1" style={{ marginBottom: 'var(--spacing-6)' }}>Mark Attendance</h1>

      {/* Date picker */}
      <div style={{ marginBottom: 'var(--spacing-6)' }}>
        <label className="text-label" style={{ color: 'var(--color-fg-secondary)', display: 'block', marginBottom: 'var(--spacing-2)' }}>Session Date</label>
        <input className="input" type="date" value={date} max={today} min={minDate}
          onChange={e => setDate(e.target.value)} style={{ maxWidth: '280px', fontFamily: 'var(--font-mono)', colorScheme: 'dark' }} />
      </div>

      {/* Session info or create form */}
      {session === undefined ? (
        <div className="card" style={{ marginBottom: 'var(--spacing-6)' }}><p className="text-body" style={{ color: 'var(--color-fg-tertiary)' }}>Loading session...</p></div>
      ) : session ? (
        <div className="card" style={{ marginBottom: 'var(--spacing-6)', display: 'flex', gap: 'var(--spacing-6)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div><p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>Topic</p><p className="text-h3">{session.topic}</p></div>
          <div><p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>Duration</p><p className="text-body-lg" style={{ fontWeight: 600 }}>{session.duration_hours} hrs</p></div>
          <div><p className="text-caption" style={{ color: 'var(--color-fg-tertiary)' }}>Type</p><p className="text-body-lg" style={{ fontWeight: 600, textTransform: 'capitalize' }}>{session.session_type}</p></div>
          {existingAttendance && <span className="pill pill-warning"><AlertTriangle size={12} /> Previously marked</span>}
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 'var(--spacing-6)' }}>
          <p className="text-body" style={{ color: 'var(--color-fg-secondary)', marginBottom: 'var(--spacing-4)' }}>No session for this date. Create one:</p>
          <div style={{ display: 'flex', gap: 'var(--spacing-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}><label className="text-caption" style={{ color: 'var(--color-fg-secondary)', display: 'block', marginBottom: 'var(--spacing-2)' }}>Topic</label><input className="input" placeholder="Session topic" value={newTopic} onChange={e => setNewTopic(e.target.value)} /></div>
            <div style={{ flex: '0 0 100px' }}><label className="text-caption" style={{ color: 'var(--color-fg-secondary)', display: 'block', marginBottom: 'var(--spacing-2)' }}>Hours</label><input className="input" type="number" step="0.5" min="0.5" max="8" value={newDuration} onChange={e => setNewDuration(e.target.value)} /></div>
            <div style={{ flex: '0 0 120px' }}><label className="text-caption" style={{ color: 'var(--color-fg-secondary)', display: 'block', marginBottom: 'var(--spacing-2)' }}>Type</label><select className="input" value={newType} onChange={e => setNewType(e.target.value)}><option value="offline">Offline</option><option value="online">Online</option></select></div>
            <button className="btn-primary" onClick={createSession} disabled={!newTopic.trim() || creatingSession}>{creatingSession ? 'Creating...' : 'Create Session'}</button>
          </div>
        </div>
      )}

      {/* Student list */}
      {session && (
        <div className="card" style={{ padding: 0 }}>
          {/* Header with bulk actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-4) var(--spacing-6)', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <p className="text-h3">Students ({students.length})</p>
            <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
              <button className="btn-secondary" onClick={() => selectAll(true)} style={{ padding: '8px 14px', fontSize: '13px' }}><Check size={14} /> All Present</button>
              <button className="btn-secondary" onClick={() => selectAll(false)} style={{ padding: '8px 14px', fontSize: '13px' }}><XCircle size={14} /> All Absent</button>
            </div>
          </div>

          {/* Student rows */}
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {students.map(s => {
              const isPresent = attendance[s.id] || false
              return (
                <div key={s.id} onClick={() => toggleStudent(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)',
                  padding: 'var(--spacing-3) var(--spacing-6)', height: '56px', cursor: 'pointer',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  borderLeft: `3px solid ${isPresent ? 'var(--color-success)' : 'var(--color-danger)'}`,
                  background: isPresent ? 'rgba(16,185,129,0.04)' : 'rgba(244,63,94,0.04)',
                  transition: 'all 0.15s ease',
                }}>
                  {/* Checkbox */}
                  <div style={{
                    width: '24px', height: '24px', borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${isPresent ? 'var(--color-success)' : 'var(--color-border-default)'}`,
                    background: isPresent ? 'var(--color-success)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}>
                    {isPresent && <Check size={14} style={{ color: 'white' }} />}
                  </div>
                  <span className="text-body-lg" style={{ flex: 1 }}>{s.name}</span>
                  <span className="text-caption" style={{ color: 'var(--color-fg-tertiary)', fontFamily: 'var(--font-mono)' }}>{s.usn}</span>
                  <span className="pill" style={{
                    background: s.branch_code === 'CS' ? 'var(--color-info-bg)' : s.branch_code === 'AI' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                    color: s.branch_code === 'CS' ? 'var(--color-info)' : s.branch_code === 'AI' ? 'var(--color-success)' : 'var(--color-warning)',
                    border: `1px solid ${s.branch_code === 'CS' ? 'var(--color-info-border)' : s.branch_code === 'AI' ? 'var(--color-success-border)' : 'var(--color-warning-border)'}`,
                    fontSize: '11px',
                  }}>{s.branch_code}</span>
                </div>
              )
            })}
          </div>

          {/* Sticky save bar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 'var(--spacing-4) var(--spacing-6)',
            borderTop: '1px solid var(--color-border-subtle)',
            background: 'var(--color-surface)',
            position: 'sticky', bottom: 0,
          }}>
            <p className="text-body" style={{ color: 'var(--color-fg-secondary)' }}>
              Present: <strong style={{ color: 'var(--color-success)' }}>{presentCount}</strong> | Absent: <strong style={{ color: 'var(--color-danger)' }}>{absentCount}</strong>
            </p>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : existingAttendance ? 'Update Attendance' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="text-h2" style={{ marginBottom: 'var(--spacing-4)' }}>Update Existing Attendance?</h2>
            <p className="text-body-lg" style={{ color: 'var(--color-fg-secondary)', marginBottom: 'var(--spacing-6)' }}>
              Attendance has already been marked for this session. This will overwrite the existing records.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-3)' }}>
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveAttendance} disabled={saving}>{saving ? 'Saving...' : 'Confirm Update'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
