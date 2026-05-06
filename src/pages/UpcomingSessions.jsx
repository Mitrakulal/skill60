import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar, Clock, MapPin, ExternalLink } from 'lucide-react'

export default function UpcomingSessions() {
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    async function fetchSessions() {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true })
      
      setSessions(data || [])
    }
    fetchSessions()
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-label text-fg-tertiary mb-2">Student Portal</p>
        <h1 className="text-display-sm">Upcoming Sessions</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {sessions.length === 0 ? (
          <div className="card text-center py-20 bg-surface-inset border-2 border-dashed border-border-subtle">
            <Calendar className="w-12 h-12 text-fg-tertiary mx-auto mb-4" />
            <p className="text-h3 text-fg-secondary">No upcoming sessions</p>
            <p className="text-body text-fg-tertiary mt-2">Check back later for new schedules.</p>
          </div>
        ) : (
          sessions.map(s => (
            <div key={s.id} className="card-hero flex flex-col md:flex-row gap-8 items-start">
              <div className="flex flex-col items-center justify-center p-6 bg-accent-glow-soft rounded-2xl border border-accent-glow/20 min-w-[120px]">
                <span className="text-label text-accent-glow uppercase">{new Date(s.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                <span className="text-display-sm text-fg-primary leading-none mt-1">{new Date(s.date).getDate()}</span>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`pill ${s.session_type === 'online' ? 'pill-info' : 'pill-warning'}`}>
                    {s.session_type}
                  </div>
                  <span className="text-caption text-fg-tertiary">·</span>
                  <span className="text-caption text-fg-tertiary">Month {s.month_number}</span>
                </div>
                <h2 className="text-h2 mb-4">{s.topic}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 text-fg-secondary">
                    <Clock className="w-4 h-4" />
                    <span className="text-body-sm">{s.duration_hours} Hours</span>
                  </div>
                  <div className="flex items-center gap-3 text-fg-secondary">
                    <MapPin className="w-4 h-4" />
                    <span className="text-body-sm">{s.session_type === 'online' ? 'Zoom / G-Meet' : 'The Forge Center'}</span>
                  </div>
                </div>
              </div>

              <button className="btn-secondary w-full md:w-auto">
                Add to Calendar <ExternalLink className="w-4 h-4 ml-2" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
