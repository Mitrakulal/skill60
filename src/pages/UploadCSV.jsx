import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  parseExcelOrCSV, 
  getColumnMapping, 
  matchStudents, 
  resolveMissingDates,
  getExistingAttendanceKeys,
  parseAttendanceValue
} from '../lib/csv-agent'
import {
  Upload, FileText, CheckCircle, AlertCircle,
  ChevronRight, Loader2, Trash2, Calendar,
  Users, Database, Clock, Info, ArrowLeft, Layers, ExternalLink
} from 'lucide-react'

export default function UploadCSV() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [file, setFile] = useState(null)
  const [allSheets, setAllSheets] = useState({})
  const [sheetNames, setSheetNames] = useState([])
  const [selectedSheets, setSelectedSheets] = useState([])
  
  const [combinedHeaders, setCombinedHeaders] = useState([])
  const [combinedData, setCombinedData] = useState([])
  const [mappings, setMappings] = useState({})
  const [missingDates, setMissingDates] = useState([])
  const [classDays, setClassDays] = useState('')
  const [matchedData, setMatchedData] = useState([])
  const [existingAttendance, setExistingAttendance] = useState(new Set())
  const [dbStudents, setDbStudents] = useState([])
  const [importStats, setImportStats] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    async function fetchStudents() {
      const { data } = await supabase.from('students').select('*')
      setDbStudents(data || [])
    }
    fetchStudents()
  }, [])

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return
    setLoading(true)
    setError('')
    try {
      const result = await parseExcelOrCSV(selectedFile)
      setFile(selectedFile)
      setAllSheets(result.sheets)
      setSheetNames(result.sheetNames)
      if (result.sheetNames.length > 1) {
        setStep(2)
      } else {
        const singleSheet = result.sheetNames[0]
        setSelectedSheets([singleSheet])
        await initiateMapping([singleSheet], result.sheets)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleSheet = (name) => {
    setSelectedSheets(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }

  const handleSheetsConfirm = async () => {
    if (selectedSheets.length === 0) return setError("Please select at least one sheet.")
    await initiateMapping(selectedSheets, allSheets)
  }

  const initiateMapping = async (names, sheets) => {
    setAiLoading(true)
    setError('')
    setStep(3)
    try {
      let headers = [], data = []
      names.forEach(name => {
        headers = [...new Set([...headers, ...sheets[name].headers])]
        data = [...data, ...sheets[name].data]
      })
      setCombinedHeaders(headers)
      setCombinedData(data)
      const mappingResult = await getColumnMapping(headers, data)
      setMappings(mappingResult.mappings)
      setClassDays(mappingResult.suggestedClassDays)
      const missing = Object.entries(mappingResult.mappings).filter(([_, v]) => v.startsWith('missing_date:')).map(([k, _]) => k)
      setMissingDates(missing)
    } catch (err) {
      setError("AI Mapping failed: " + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const handleResolveDates = async () => {
    setAiLoading(true)
    try {
      const knownDates = Object.values(mappings).filter(v => v.startsWith('date:')).map(v => v.replace('date:', ''))
      const res = missingDates.length > 0 ? await resolveMissingDates(missingDates, knownDates, classDays) : { resolvedDates: {} }
      const finalMappings = { ...mappings }
      Object.entries(res.resolvedDates).forEach(([header, date]) => { finalMappings[header] = `date:${date}` })
      const matched = matchStudents(combinedData, dbStudents, finalMappings)
      const existing = await getExistingAttendanceKeys(supabase)
      setMatchedData(matched)
      setExistingAttendance(existing)
      setMappings(finalMappings)
      setStep(4)
    } catch (err) {
      setError("Failed to resolve dates: " + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const handleFinalImport = async () => {
    setLoading(true)
    try {
      const dateCols = Object.entries(mappings).filter(([_, v]) => v.startsWith('date:')).map(([header, val]) => ({ header, date: val.replace('date:', '') }))
      // 1. Ensure sessions exist & get their IDs
      const uniqueDates = [...new Set(dateCols.map(d => d.date))]
      const sessionMap = {}
      
      for (const d of uniqueDates) {
        // Upsert session and get its ID
        const { data: session, error: sErr } = await supabase
          .from('sessions')
          .upsert({ 
            date: d, 
            topic: `Session on ${d}`,
            month_number: new Date(d).getMonth() + 1
          }, { onConflict: 'date' })
          .select('id')
          .single()
        
        if (sErr) {
          console.error(`Error upserting session for ${d}:`, sErr)
          throw new Error(`Failed to create session for ${d}: ${sErr.message}`)
        }
        sessionMap[d] = session.id
      }

      // 2. Prepare attendance records
      const attendanceToInsert = []
      let skippedCount = 0
      let newlyCreatedStudents = 0

      for (const row of matchedData) {
        let studentId = row._matchedStudent?.id

        // AUTO-CREATE STUDENT: If student doesn't exist, create them now
        if (!studentId && row._csvName && row._csvUsn) {
          const { data: newStudent, error: sErr } = await supabase
            .from('students')
            .insert({
              name: row._csvName,
              usn: row._csvUsn,
              email: row.email || row.Email || null,
              branch_code: row.branch_code || row.branch || 'GEN',
              batch: '2024-2028'
            })
            .select()
            .single()
          
          if (!sErr && newStudent) {
            studentId = newStudent.id
            newlyCreatedStudents++
          }
        }

        if (!studentId) {
          skippedCount++
          continue
        }

        dateCols.forEach(({ header, date }) => {
          const val = parseAttendanceValue(row[header])
          if (val === null) return // Skip empty cells

          const key = `${studentId}-${date}`
          if (!existingAttendance.has(key)) {
            attendanceToInsert.push({
              student_id: studentId,
              session_id: sessionMap[date],
              present: val,
              marked_by: 'ai-import'
            })
          } else {
            skippedCount++
          }
        })
      }

      if (attendanceToInsert.length > 0) {
        const { error: iErr } = await supabase.from('attendance').insert(attendanceToInsert)
        if (iErr) {
          console.error('Attendance insert error:', iErr)
          throw new Error(`Failed to insert attendance: ${iErr.message}`)
        }
      }

      // 3. Create Import Log Entry
      await supabase.from('import_log').insert({
        filename: file.name,
        uploaded_by: 'Mentor (AI)',
        total_rows: combinedData.length,
        imported_rows: attendanceToInsert.length,
        skipped_rows: skippedCount,
        warnings: newlyCreatedStudents > 0 ? `Auto-created ${newlyCreatedStudents} new students.` : null,
        column_mapping: JSON.stringify(mappings),
        status: 'completed'
      })

      setImportStats({ total: combinedData.length, imported: attendanceToInsert.length, skipped: skippedCount })
      setStep(5)
    } catch (err) {
      setError("Import failed: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setStep(1); setFile(null); setError(''); setSelectedSheets([]) }

  return (
    <div className="app-main min-h-screen relative font-body selection:bg-accent-glow/30">
      
      <div className="max-w-[1400px] mx-auto pt-[var(--spacing-16)] pb-[var(--spacing-24)] px-[var(--spacing-8)] relative z-10">
        
        {/* PROGRESS SYSTEM */}
        <div className="flex items-center gap-[var(--spacing-2)] mb-[var(--spacing-12)] overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-700 ease-out ${step >= i ? 'bg-[var(--color-accent-glow)]' : 'bg-[var(--color-border-subtle)]'}`} />
          ))}
        </div>

        {/* HERO HEADER */}
        <header className="mb-[var(--spacing-20)] flex flex-col md:flex-row md:items-end md:justify-between gap-[var(--spacing-8)]">
          <div className="flex-1">
            <div className="flex items-center gap-[var(--spacing-2)] mb-[var(--spacing-4)]">
              <span className="text-[var(--color-accent-glow)]"><Layers size={14} /></span>
              <span className="text-[11px] font-bold tracking-[0.2em] text-[var(--color-fg-tertiary)] uppercase font-mono">System / Sync Matrix</span>
            </div>
            <h1 className="text-display-hero text-[var(--color-fg-primary)]">
              Bulk <span className="opacity-30">Import</span>
            </h1>
            <p className="text-[var(--color-fg-secondary)] max-w-xl text-lg mt-[var(--spacing-4)] leading-relaxed">
              Proprietary AI-driven attendance reconciliation. Cross-reference disparate spreadsheets with the production students table.
            </p>
          </div>
          
          <div className="flex items-center gap-[var(--spacing-4)]">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-bold text-[var(--color-fg-tertiary)] uppercase tracking-widest mb-1">Status</div>
              <div className="flex items-center gap-2 justify-end">
                <div className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-success)]'} animate-pulse`} />
                <span className="text-xs font-bold font-mono text-[var(--color-fg-primary)] tracking-tight">
                  {loading || aiLoading ? 'PROCESSING' : error ? 'FAILURE' : 'READY_OPS'}
                </span>
              </div>
            </div>
            {step > 1 && (
              <button onClick={reset} className="btn-secondary h-12 px-6 flex items-center gap-2">
                <Trash2 size={14} /> <span className="text-xs font-bold uppercase tracking-widest">Abort</span>
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] rounded-[var(--radius-lg)] p-[var(--spacing-6)] flex items-start gap-[var(--spacing-4)] mb-[var(--spacing-12)] animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="text-[var(--color-danger)] shrink-0 mt-1" size={20} />
            <div>
              <h4 className="text-sm font-bold text-[var(--color-fg-primary)] mb-1 uppercase tracking-wider">Exception Encountered</h4>
              <p className="text-xs text-[var(--color-fg-secondary)] font-mono leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* ─── STEP 1: DROPZONE ─── */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--spacing-8)]">
            <div className="lg:col-span-8">
              <div className="card h-full flex flex-col items-center justify-center py-[var(--spacing-24)] px-[var(--spacing-12)] relative group border-dashed hover:border-[var(--color-accent-glow)] transition-all">
                <div className="absolute inset-0 bg-accent-glow/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <label className="flex flex-col items-center cursor-pointer relative z-10 w-full">
                  <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center mb-[var(--spacing-8)] border border-border-default group-hover:scale-110 transition-transform">
                    {loading ? <Loader2 className="text-[var(--color-accent-glow)] animate-spin" size={32} /> : <Upload className="text-[var(--color-accent-glow)]" size={32} />}
                  </div>
                  <h2 className="text-display-sm text-[var(--color-fg-primary)] mb-[var(--spacing-2)]">Source Connection</h2>
                  <p className="text-[var(--color-fg-secondary)] text-sm mb-[var(--spacing-10)]">Connect a .xlsx, .csv or .xls file to the sync engine.</p>
                  <div className="btn-primary h-14 px-12 text-base shadow-lg shadow-accent-glow/20 transition-all">
                    {loading ? 'Initializing...' : 'Link Spreadsheet'}
                  </div>
                  <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} disabled={loading} />
                </label>
              </div>
            </div>
            
            <div className="lg:col-span-4 flex flex-col gap-[var(--spacing-4)]">
              <div className="card p-[var(--spacing-8)] flex-1">
                <div className="text-[10px] font-bold text-[var(--color-fg-tertiary)] uppercase tracking-[0.2em] mb-[var(--spacing-6)]">Protocols</div>
                <div className="space-y-[var(--spacing-6)]">
                  <div className="flex gap-4">
                    <CheckCircle className="text-[var(--color-success)] shrink-0" size={16} />
                    <div className="text-xs text-[var(--color-fg-secondary)] leading-relaxed">Multi-sheet parsing active.</div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle className="text-[var(--color-success)] shrink-0" size={16} />
                    <div className="text-xs text-[var(--color-fg-secondary)] leading-relaxed">Automatic Excel serial date decoding.</div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle className="text-[var(--color-success)] shrink-0" size={16} />
                    <div className="text-xs text-[var(--color-fg-secondary)] leading-relaxed">Llama 3.3 Reasoning for unlabelled columns.</div>
                  </div>
                </div>
              </div>
              <div className="card p-[var(--spacing-8)] bg-surface-inset">
                <h4 className="text-[10px] font-bold text-[var(--color-fg-tertiary)] uppercase tracking-widest mb-3">Audit Logs</h4>
                <div className="font-mono text-[9px] text-[var(--color-fg-tertiary)] space-y-1">
                  <div>[SYS] v4.2.0 initialised</div>
                  <div>[AI] Waiting for source...</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2: SHEET SELECT ─── */}
        {step === 2 && (
          <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-8">
            <h2 className="text-display-md text-[var(--color-fg-primary)] mb-[var(--spacing-4)]">Data Segments</h2>
            <p className="text-[var(--color-fg-secondary)] mb-[var(--spacing-10)]">The spreadsheet contains multiple segments. Select those to be ingested.</p>
            <div className="grid grid-cols-1 gap-[var(--spacing-4)] mb-[var(--spacing-12)]">
              {sheetNames.map(name => (
                <button 
                  key={name} onClick={() => toggleSheet(name)}
                  className={`card p-[var(--spacing-6)] flex items-center justify-between group transition-all ${selectedSheets.includes(name) ? 'border-[var(--color-accent-glow)] bg-accent-glow/5' : 'hover:bg-surface-raised'}`}
                >
                  <div className="flex items-center gap-[var(--spacing-4)]">
                    <div className={`w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center border transition-all ${selectedSheets.includes(name) ? 'bg-accent-glow text-fg-inverse border-accent-glow' : 'bg-surface-raised border-border-default text-fg-secondary'}`}>
                      <FileText size={20} />
                    </div>
                    <div className="text-left">
                      <div className={`font-bold text-lg ${selectedSheets.includes(name) ? 'text-[var(--color-fg-primary)]' : 'text-[var(--color-fg-secondary)]'}`}>{name}</div>
                      <div className="text-[10px] uppercase tracking-widest text-[var(--color-fg-tertiary)] font-bold">{allSheets[name].rowCount} lines available</div>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${selectedSheets.includes(name) ? 'bg-accent-glow border-accent-glow text-fg-inverse' : 'border-border-default'}`}>
                    {selectedSheets.includes(name) && <CheckCircle size={14} />}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={handleSheetsConfirm} className="btn-primary w-full h-16 text-lg tracking-tight">
              Execute Parse Sequence <ChevronRight size={18} className="ml-2" />
            </button>
          </div>
        )}

        {/* ─── STEP 3: AI MAPPING ─── */}
        {step === 3 && (
          <div className="card p-[var(--spacing-12)] animate-in fade-in zoom-in-95">
            {aiLoading ? (
              <div className="flex flex-col items-center py-[var(--spacing-16)]">
                <div className="relative w-20 h-20 mb-8">
                  <div className="absolute inset-0 rounded-full border-4 border-[var(--color-accent-glow-soft)]" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-[var(--color-accent-glow)] animate-spin" />
                </div>
                <h2 className="text-display-sm text-[var(--color-fg-primary)] mb-2">Neural Analysis</h2>
                <p className="text-[var(--color-fg-secondary)] text-sm text-center max-w-sm font-mono opacity-60">LLM is cross-referencing headers with schema definitions...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--spacing-16)]">
                <div>
                  <h3 className="text-[11px] font-bold text-[var(--color-fg-tertiary)] uppercase tracking-[0.2em] mb-8">Schema Linkage</h3>
                  <div className="space-y-[var(--spacing-3)]">
                    {Object.entries(mappings).filter(([_, v]) => !v.startsWith('IGNORE')).slice(0, 6).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-4 bg-surface-inset p-4 rounded-[var(--radius-md)] border border-border-subtle group hover:border-border-strong transition-all">
                        <div className="text-[10px] font-mono text-[var(--color-fg-tertiary)] truncate w-40 group-hover:text-fg-secondary">{k}</div>
                        <div className="h-px flex-1 bg-border-subtle" />
                        <div className="text-[10px] font-bold text-[var(--color-accent-glow)] uppercase tracking-wider">{v.replace('date:', '')}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-surface-inset p-[var(--spacing-8)] rounded-[var(--radius-xl)] flex flex-col border border-border-default">
                  <div className="flex items-center gap-3 text-[var(--color-accent-glow)] mb-6">
                    <Calendar size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">Chronos Resolver</span>
                  </div>
                  <p className="text-[var(--color-fg-secondary)] text-xs mb-8 leading-relaxed font-body">Unlabelled session columns identified. Define your weekly recurring schedule to enable chronological inference.</p>
                  <div className="space-y-2 mb-10">
                    <label className="text-[10px] font-bold text-[var(--color-fg-tertiary)] uppercase tracking-widest">Reoccurrence Logic</label>
                    <input 
                      type="text" value={classDays} onChange={(e) => setClassDays(e.target.value)}
                      placeholder="e.g. MON, WED, FRI at 14:00"
                      className="w-full bg-surface-raised border border-border-default rounded-[var(--radius-md)] p-4 text-[var(--color-fg-primary)] text-sm outline-none focus:border-[var(--color-accent-glow)] transition-all font-mono"
                    />
                  </div>
                  <button onClick={handleResolveDates} className="mt-auto btn-primary h-14 w-full text-sm font-bold">
                    Validate Matrix
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 4: REVIEW ─── */}
        {step === 4 && (
          <div className="space-y-[var(--spacing-8)] animate-in fade-in slide-in-from-right-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <h2 className="text-display-md text-[var(--color-fg-primary)]">Pre-Flight Review</h2>
                <p className="text-[var(--color-fg-secondary)] text-sm font-mono mt-1 opacity-60">Ready to commit {matchedData.length} entities across {Object.values(mappings).filter(v => v.startsWith('date:')).length} session windows.</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-surface p-4 rounded-[var(--radius-md)] border border-border-default min-w-[120px]">
                  <div className="text-[10px] font-bold text-[var(--color-fg-tertiary)] uppercase tracking-widest mb-1">Students</div>
                  <div className="text-xl font-bold text-white font-mono tracking-tighter">{matchedData.length}</div>
                </div>
                <div className="bg-surface p-4 rounded-[var(--radius-md)] border border-border-default min-w-[120px]">
                  <div className="text-[10px] font-bold text-[var(--color-fg-tertiary)] uppercase tracking-widest mb-1">Sessions</div>
                  <div className="text-xl font-bold text-white font-mono tracking-tighter">
                    {Object.values(mappings).filter(v => v.startsWith('date:')).length}
                  </div>
                </div>
              </div>
            </div>

            <div className="card rounded-[var(--radius-xl)] overflow-hidden">
              <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-inset sticky top-0 z-20">
                    <tr>
                      <th className="p-5 text-[10px] font-bold text-[var(--color-fg-tertiary)] uppercase tracking-widest border-b border-border-default bg-surface-inset">Identity Link</th>
                      {Object.entries(mappings).filter(([_, v]) => v.startsWith('date:')).map(([h, v]) => (
                        <th key={h} className="p-5 text-[10px] font-bold text-[var(--color-fg-tertiary)] uppercase tracking-widest border-b border-border-default whitespace-nowrap bg-surface-inset font-mono">
                          {v.replace('date:', '')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {matchedData.slice(0, 30).map((row, i) => (
                      <tr key={i} className="group border-b border-border-subtle hover:bg-white/[0.01] transition-colors">
                        <td className="p-5">
                          <div className="flex flex-col">
                            <span className={`text-[13px] font-bold tracking-tight ${row._matchedStudent ? 'text-[var(--color-fg-primary)]' : 'text-[var(--color-danger)]'}`}>
                              {row._csvName || 'Unnamed'}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-[var(--color-fg-tertiary)] uppercase tracking-tight">
                                {row._csvUsn || 'NO USN'}
                              </span>
                              {!row._matchedStudent && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-danger-bg text-[var(--color-danger)] font-bold uppercase tracking-tighter border border-danger-border">
                                  No Match
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        {Object.entries(mappings).filter(([_, v]) => v.startsWith('date:')).map(([h, v]) => {
                          const date = v.replace('date:', ''), val = parseAttendanceValue(row[h]);
                          const isDup = row._matchedStudent && existingAttendance.has(`${row._matchedStudent.id}-${date}`);
                          return (
                            <td key={h} className="p-5">
                              {isDup ? (
                                <div className="text-[10px] font-bold text-[var(--color-warning)] opacity-40 uppercase tracking-tighter">Existing</div>
                              ) : val === true ? (
                                <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-success-bg)] border border-[var(--color-success-border)] flex items-center justify-center text-[var(--color-success)] text-[11px] font-bold">P</div>
                              ) : val === false ? (
                                <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] flex items-center justify-center text-[var(--color-danger)] text-[11px] font-bold">A</div>
                              ) : (
                                <span className="text-[var(--color-fg-tertiary)]">··</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between p-[var(--spacing-8)] bg-surface-raised rounded-[var(--radius-xl)] border border-border-default shadow-2xl gap-8">
              <div className="flex items-center gap-[var(--spacing-4)]">
                <div className="w-12 h-12 rounded-full bg-accent-glow/10 flex items-center justify-center text-[var(--color-accent-glow)]">
                  <Database size={24} />
                </div>
                <div>
                  <h4 className="text-[var(--color-fg-primary)] font-bold">Execute Database Ingestion</h4>
                  <p className="text-[var(--color-fg-tertiary)] text-[11px] tracking-tight">System will automatically skip records marked as "Existing".</p>
                </div>
              </div>
              <button 
                onClick={handleFinalImport} disabled={loading}
                className="btn-primary h-16 px-16 text-lg w-full sm:w-auto shadow-xl shadow-accent-glow/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : 'Sync with Production'}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 5: SUCCESS ─── */}
        {step === 5 && (
          <div className="max-w-3xl mx-auto text-center py-[var(--spacing-24)] animate-in fade-in zoom-in-95">
            <div className="w-24 h-24 rounded-full bg-[var(--color-success-bg)] flex items-center justify-center mx-auto mb-[var(--spacing-10)] border border-[var(--color-success-border)] shadow-[0_0_50px_rgba(16,185,129,0.1)]">
              <CheckCircle size={48} className="text-[var(--color-success)]" />
            </div>
            <h2 className="text-display-lg text-[var(--color-fg-primary)] mb-[var(--spacing-4)]">Ingestion Complete</h2>
            <p className="text-[var(--color-fg-secondary)] text-lg mb-[var(--spacing-16)] max-w-lg mx-auto">The attendance matrix has been reconciled and committed to the students dataset.</p>
            
            <div className="grid grid-cols-3 gap-[var(--spacing-6)] mb-[var(--spacing-20)]">
              <div className="card p-[var(--spacing-8)] bg-surface-inset">
                <div className="text-4xl font-bold text-[var(--color-fg-primary)] font-mono tracking-tighter mb-1">{importStats.imported}</div>
                <div className="text-[10px] font-bold text-[var(--color-fg-tertiary)] uppercase tracking-widest">Committed</div>
              </div>
              <div className="card p-[var(--spacing-8)] bg-surface-inset">
                <div className="text-4xl font-bold text-[var(--color-fg-primary)] font-mono tracking-tighter mb-1">{importStats.total}</div>
                <div className="text-[10px] font-bold text-[var(--color-fg-tertiary)] uppercase tracking-widest">Processed</div>
              </div>
              <div className="card p-[var(--spacing-8)] bg-surface-inset border-[var(--color-warning-border)]">
                <div className="text-4xl font-bold text-[var(--color-warning)] font-mono tracking-tighter mb-1">{importStats.skipped}</div>
                <div className="text-[10px] font-bold text-[var(--color-warning)] opacity-50 uppercase tracking-widest">Duplicates</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-[var(--spacing-4)] justify-center">
              <button onClick={() => navigate('/dashboard')} className="btn-primary h-14 px-12">Return to Dashboard</button>
              <button onClick={reset} className="btn-secondary h-14 px-12">Ingest New Dataset</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
