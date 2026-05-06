import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CheckCircle, XCircle, Minus, Calendar, User } from 'lucide-react'

export default function MyAttendance() {
  const { studentId, displayName } = useAuth()
  const [attendance, setAttendance] = useState([])
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState({ total: 0, present: 0, pct: '—' })

  useEffect(() => {
    if (!studentId) return

    async function fetchData() {
      const { data: sess } = await supabase.from('sessions').select('*').order('date', { ascending: true })
      const { data: att } = await supabase.from('attendance').select('*, sessions(*)').eq('student_id', studentId)
      
      setSessions(sess || [])
      setAttendance(att || [])

      const total = sess?.length || 0
      const present = att?.filter(a => a.present).length || 0
      const pct = total > 0 ? ((present / total) * 100).toFixed(1) : '—'
      setStats({ total, present, pct })
    }
    fetchData()
  }, [studentId])

  const attMap = {}
  attendance.forEach(a => { if (a.sessions) attMap[a.sessions.date] = a.present })

  const pctNum = parseFloat(stats.pct) || 0
  const pctColor = pctNum >= 75 ? 'text-success' : pctNum >= 60 ? 'text-warning' : 'text-danger'

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-label text-fg-tertiary mb-2">Student Portal</p>
        <h1 className="text-display-sm">My Attendance</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card flex flex-col items-center text-center">
          <p className="text-label text-fg-tertiary mb-4">Overall Score</p>
          <div className={`text-display-md ${pctColor}`}>{stats.pct}%</div>
          <p className="text-body-sm text-fg-secondary mt-2">{stats.present} of {stats.total} sessions</p>
        </div>

        <div className="card md:col-span-2">
          <p className="text-label text-fg-tertiary mb-4">Monthly Status</p>
          <div className="flex flex-wrap gap-3">
             {sessions.map(s => {
               const status = attMap[s.date]
               return (
                 <div key={s.id} title={`${s.date}: ${s.topic}`} className={`w-8 h-8 rounded-lg flex items-center justify-center text-micro border ${
                   status === true ? 'bg-success-bg border-success-border text-success' :
                   status === false ? 'bg-danger-bg border-danger-border text-danger' :
                   'bg-surface-inset border-border-subtle text-fg-tertiary'
                 }`}>
                   {new Date(s.date).getDate()}
                 </div>
               )
             })}
          </div>
        </div>
      </div>

      <div className="card p-0">
        <table className="ft-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Topic</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => {
              const status = attMap[s.date]
              return (
                <tr key={s.id}>
                  <td className="font-mono">{new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  <td>{s.topic}</td>
                  <td>
                    {status === true ? (
                      <div className="pill pill-success"><CheckCircle className="w-3 h-3" /> Present</div>
                    ) : status === false ? (
                      <div className="pill pill-danger"><XCircle className="w-3 h-3" /> Absent</div>
                    ) : (
                      <div className="pill text-fg-tertiary border-border-subtle"><Minus className="w-3 h-3" /> No Record</div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
