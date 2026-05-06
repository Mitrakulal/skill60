import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Plus, FileText, Video, Link2, FileSpreadsheet, X, ExternalLink } from 'lucide-react'

const typeIcons = { slides: FileSpreadsheet, recording: Video, document: FileText, link: Link2 }

import { useAuth } from '../contexts/AuthContext'

export default function Materials() {
  const { role } = useAuth()
  const [sessions, setSessions] = useState([])
  const [materials, setMaterials] = useState([])
  const [month, setMonth] = useState('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [months, setMonths] = useState([])

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: sess } = await supabase.from('sessions').select('*').order('date', { ascending: false })
    const { data: mats } = await supabase.from('materials').select('*')
    setSessions(sess || [])
    setMaterials(mats || [])
    const ms = [...new Set((sess || []).map(s => s.month_number))].sort((a, b) => a - b)
    setMonths(ms)
  }

  // Group materials by session
  const sessionMats = {}
  materials.forEach(m => {
    if (!sessionMats[m.session_id]) sessionMats[m.session_id] = []
    sessionMats[m.session_id].push(m)
  })

  // Filter sessions
  const filtered = sessions.filter(s => {
    if (month !== 'all' && s.month_number !== parseInt(month)) return false
    if (search) {
      const q = search.toLowerCase()
      const hasTopic = s.topic.toLowerCase().includes(q)
      const hasMat = (sessionMats[s.id] || []).some(m => m.title.toLowerCase().includes(q))
      if (!hasTopic && !hasMat) return false
    }
    return sessionMats[s.id]?.length > 0
  })

  return (
    <div>
      <h1 className="text-h1" style={{ marginBottom: 'var(--spacing-6)' }}>Materials</h1>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)', flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input" value={month} onChange={e => setMonth(e.target.value)}
          style={{ width: '160px', colorScheme: 'dark' }}>
          <option value="all">All Months</option>
          {months.map(m => <option key={m} value={m}>Month {m}</option>)}
        </select>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-fg-tertiary)' }} />
          <input className="input" placeholder="Search topics or materials..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '40px' }} />
        </div>
        {role === 'mentor' && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Material</button>
        )}
      </div>

      {/* Materials grid */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
          <p className="text-body-lg" style={{ color: 'var(--color-fg-secondary)' }}>No materials found for this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--spacing-6)' }}>
          {filtered.map(s => (
            <div key={s.id} className="card">
              <p className="text-caption" style={{ color: 'var(--color-fg-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: 'var(--spacing-2)' }}>
                {new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · Month {s.month_number}
              </p>
              <h3 className="text-h3" style={{ marginBottom: 'var(--spacing-4)' }}>{s.topic}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                {(sessionMats[s.id] || []).map(m => {
                  const Icon = typeIcons[m.type] || Link2
                  return (
                    <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)',
                        padding: 'var(--spacing-2) var(--spacing-3)', borderRadius: 'var(--radius-md)',
                        textDecoration: 'none', color: 'var(--color-fg-primary)', fontSize: '14px',
                        background: 'var(--color-surface-inset)', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-raised)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-inset)'}>
                      <Icon size={16} style={{ color: 'var(--color-fg-secondary)', flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{m.title}</span>
                      <ExternalLink size={14} style={{ color: 'var(--color-fg-tertiary)' }} />
                    </a>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Material Modal */}
      {showAdd && <AddMaterialModal sessions={sessions} onClose={() => setShowAdd(false)} onAdded={fetchData} />}
    </div>
  )
}

function AddMaterialModal({ sessions, onClose, onAdded }) {
  const [sessionId, setSessionId] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('slides')
  const [url, setUrl] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!sessionId || !title.trim() || !url.trim()) { setError('Fill all required fields.'); return }
    try { new URL(url) } catch { setError('Invalid URL format.'); return }
    setSaving(true)
    const { error: err } = await supabase.from('materials').insert({ session_id: parseInt(sessionId), title: title.trim(), type, url: url.trim(), description: desc.trim() || null })
    setSaving(false)
    if (err) { setError(err.message); return }
    onAdded()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-6)' }}>
          <h2 className="text-h2">Add Material</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-fg-secondary)' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <div><label className="text-caption" style={{ color: 'var(--color-fg-secondary)', display: 'block', marginBottom: 'var(--spacing-2)' }}>Session *</label>
            <select className="input" value={sessionId} onChange={e => setSessionId(e.target.value)} style={{ colorScheme: 'dark' }}>
              <option value="">Select a session...</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.date} — {s.topic}</option>)}
            </select>
          </div>
          <div><label className="text-caption" style={{ color: 'var(--color-fg-secondary)', display: 'block', marginBottom: 'var(--spacing-2)' }}>Title *</label><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Material title" /></div>
          <div><label className="text-caption" style={{ color: 'var(--color-fg-secondary)', display: 'block', marginBottom: 'var(--spacing-2)' }}>Type</label>
            <select className="input" value={type} onChange={e => setType(e.target.value)} style={{ colorScheme: 'dark' }}>
              <option value="slides">Slides</option><option value="recording">Recording</option><option value="document">Document</option><option value="link">Link</option>
            </select>
          </div>
          <div><label className="text-caption" style={{ color: 'var(--color-fg-secondary)', display: 'block', marginBottom: 'var(--spacing-2)' }}>URL *</label><input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></div>
          <div><label className="text-caption" style={{ color: 'var(--color-fg-secondary)', display: 'block', marginBottom: 'var(--spacing-2)' }}>Description</label><input className="input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" /></div>
        </div>
        {error && <p className="text-caption" style={{ color: 'var(--color-danger)', marginTop: 'var(--spacing-3)' }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-6)' }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Adding...' : 'Add Material'}</button>
        </div>
      </div>
    </div>
  )
}
