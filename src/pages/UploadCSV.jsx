import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { parseCSV, getColumnMapping, matchStudents } from '../lib/csv-agent'
import { 
  Upload, FileText, CheckCircle, AlertCircle, 
  ChevronRight, ArrowLeft, Loader2, Info, Check, X 
} from 'lucide-react'

export default function UploadCSV() {
  const [step, setStep] = useState(1) // 1: Select, 2: Map, 3: Preview, 4: Result
  const [file, setFile] = useState(null)
  const [rawData, setRawData] = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [matchedData, setMatchedData] = useState([])
  const [dbStudents, setDbStudents] = useState([])
  const [dbSessions, setDbSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [importStats, setImportStats] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    // Pre-fetch students and sessions for matching
    async function fetchData() {
      const { data: students } = await supabase.from('students').select('*')
      const { data: sessions } = await supabase.from('sessions').select('*')
      setDbStudents(students || [])
      setDbSessions(sessions || [])
    }
    fetchData()
  }, [])

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a .csv file.')
      return
    }

    setFile(selectedFile)
    setLoading(true)
    setError('')

    try {
      const results = await parseCSV(selectedFile)
      setRawData(results.data)
      setHeaders(results.meta.fields)
      
      // Step 2: Get AI Mapping
      const aiMapping = await getColumnMapping(results.meta.fields)
      setMapping(aiMapping)
      setStep(2)
    } catch (err) {
      setError('Failed to parse CSV or get AI mapping: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStartMapping = () => {
    const matched = matchStudents(rawData, dbStudents, mapping)
    setMatchedData(matched)
    setStep(3)
  }

  const handleImport = async () => {
    setLoading(true)
    setError('')

    try {
      let importedCount = 0
      let skippedCount = 0
      const warnings = []

      // 1. Identify date columns and ensure sessions exist
      const dateMappings = Object.entries(mapping)
        .filter(([_, val]) => val.startsWith('date:'))
        .map(([header, val]) => ({ header, date: val.split(':')[1] }))

      const sessionMap = {} // date -> sessionId
      for (const { date } of dateMappings) {
        let session = dbSessions.find(s => s.date === date)
        if (!session) {
          // Auto-create missing session
          const { data, error } = await supabase.from('sessions').insert({
            date,
            topic: `Imported Session (${date})`,
            month_number: new Date(date).getMonth() + 1,
          }).select().single()
          
          if (error) throw error
          session = data
        }
        sessionMap[date] = session.id
      }

      // 2. Insert attendance
      const attendanceRows = []
      matchedData.forEach(row => {
        if (!row._matchedStudent) {
          skippedCount++
          warnings.push(`Skipped row: ${JSON.stringify(row)} (No student match)`)
          return
        }

        dateMappings.forEach(({ header, date }) => {
          const val = row[header]?.toString().toLowerCase()
          const isPresent = val === 'p' || val === 'present' || val === '1' || val === 'yes'
          
          attendanceRows.push({
            student_id: row._matchedStudent.id,
            session_id: sessionMap[date],
            present: isPresent,
            marked_by: 'ai-import',
          })
        })
        importedCount++
      });

      // Batch upsert attendance
      const { error: upsertError } = await supabase
        .from('attendance')
        .upsert(attendanceRows, { onConflict: 'student_id,session_id' })

      if (upsertError) throw upsertError

      // 3. Log the import
      await supabase.from('import_log').insert({
        filename: file.name,
        uploaded_by: 'Mentor', // TODO: get from auth
        total_rows: rawData.length,
        imported_rows: importedCount,
        skipped_rows: skippedCount,
        warnings: JSON.stringify(warnings),
        column_mapping: JSON.stringify(mapping),
        status: 'completed',
      })

      setImportStats({ imported: importedCount, total: rawData.length, skipped: skippedCount })
      setStep(4)
    } catch (err) {
      setError('Import failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-display-sm">Import Attendance</h1>
          <p className="text-body-lg text-fg-secondary">Upload CSV and let AI map the columns.</p>
        </div>
        {step > 1 && step < 4 && (
          <button className="btn-secondary" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-caption font-bold ${
              step === s ? 'bg-accent-glow text-white' : 
              step > s ? 'bg-success-bg text-success' : 'bg-surface-raised text-fg-tertiary'
            }`}>
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            <span className={`text-caption font-medium whitespace-nowrap ${
              step === s ? 'text-fg-primary' : 'text-fg-tertiary'
            }`}>
              {s === 1 ? 'Select File' : s === 2 ? 'Map Columns' : s === 3 ? 'Preview' : 'Success'}
            </span>
            {s < 4 && <ChevronRight className="w-4 h-4 text-fg-tertiary" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="card mb-6 bg-danger-bg/20 border-danger-border flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-danger shrink-0" />
          <p className="text-body text-danger">{error}</p>
        </div>
      )}

      {/* STEP 1: Select File */}
      {step === 1 && (
        <div className="card-hero border-2 border-dashed border-border-default flex flex-col items-center justify-center py-20 bg-surface-inset">
          {loading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-accent-glow animate-spin mb-4" />
              <p className="text-h3">AI is analyzing your CSV...</p>
              <p className="text-body text-fg-tertiary mt-2">Identifying student names, USNs, and date columns.</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-accent-glow-soft flex items-center justify-center mb-6">
                <Upload className="w-8 h-8 text-accent-glow" />
              </div>
              <h2 className="text-h2 mb-2">Drop your CSV here</h2>
              <p className="text-body text-fg-secondary mb-8">Or click to browse from your computer.</p>
              <label className="btn-primary cursor-pointer">
                Select CSV File
                <input type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
              </label>
            </>
          )}
        </div>
      )}

      {/* STEP 2: Map Columns */}
      {step === 2 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-6 bg-info-bg/10 p-4 rounded-xl border border-info-border">
            <Info className="w-5 h-5 text-info" />
            <p className="text-body-sm text-fg-secondary">
              Our AI has suggested these mappings. Please verify them before proceeding.
            </p>
          </div>

          <table className="ft-table mb-8">
            <thead>
              <tr>
                <th>CSV Header</th>
                <th>Maps To</th>
                <th>Sample Value</th>
              </tr>
            </thead>
            <tbody>
              {headers.map(header => (
                <tr key={header}>
                  <td className="font-mono text-body-sm">{header}</td>
                  <td>
                    <select 
                      className="input py-1 h-auto w-auto"
                      value={mapping[header] || 'IGNORE'}
                      onChange={(e) => setMapping({...mapping, [header]: e.target.value})}
                    >
                      <option value="IGNORE">Ignore</option>
                      <option value="student_name">Student Name</option>
                      <option value="usn">USN</option>
                      <option value="email">Email</option>
                      <option value="branch_code">Branch Code</option>
                      {mapping[header]?.startsWith('date:') && (
                        <option value={mapping[header]}>Date: {mapping[header].split(':')[1]}</option>
                      )}
                      {!mapping[header]?.startsWith('date:') && (
                         <optgroup label="Dates">
                            <option value={`date:${header}`}>As Date: {header}</option>
                         </optgroup>
                      )}
                    </select>
                  </td>
                  <td className="text-fg-tertiary italic">{rawData[0]?.[header] || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <button className="btn-primary" onClick={handleStartMapping}>
              Preview Matches <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Preview */}
      {step === 3 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-h2">Review Matches</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success"></div>
                <span className="text-caption text-fg-secondary">
                  {matchedData.filter(d => d._status === 'matched').length} Matched
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-danger"></div>
                <span className="text-caption text-fg-secondary">
                  {matchedData.filter(d => d._status === 'unmatched').length} Unmatched
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto -mx-8">
            <table className="ft-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>CSV Identity</th>
                  <th>Matched Student</th>
                  {Object.entries(mapping).filter(([_, v]) => v.startsWith('date:')).map(([h]) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matchedData.map((row, i) => (
                  <tr key={i} className={row._status === 'unmatched' ? 'bg-danger-bg/5' : ''}>
                    <td>
                      {row._status === 'matched' ? (
                        <div className="pill pill-success"><Check className="w-3 h-3" /> Matched</div>
                      ) : (
                        <div className="pill pill-danger"><X className="w-3 h-3" /> No Match</div>
                      )}
                    </td>
                    <td>
                      <div className="text-body-sm">{row[Object.keys(mapping).find(k => mapping[k] === 'student_name')] || 'No Name'}</div>
                      <div className="text-caption text-fg-tertiary font-mono">{row[Object.keys(mapping).find(k => mapping[k] === 'usn')] || 'No USN'}</div>
                    </td>
                    <td>
                      {row._matchedStudent ? (
                        <div>
                          <div className="text-body-sm font-medium">{row._matchedStudent.name}</div>
                          <div className="text-caption text-fg-tertiary">{row._matchedStudent.usn}</div>
                        </div>
                      ) : (
                        <span className="text-caption text-danger">Requires manual creation</span>
                      )}
                    </td>
                    {Object.entries(mapping).filter(([_, v]) => v.startsWith('date:')).map(([h]) => (
                      <td key={h}>
                        <div className={`pill ${
                          ['p', 'present', '1', 'yes'].includes(row[h]?.toString().toLowerCase()) 
                          ? 'pill-success' : 'pill-danger'
                        }`}>
                          {row[h] || 'A'}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-8 gap-4">
            <button className="btn-secondary" onClick={() => setStep(2)}>Adjust Mapping</button>
            <button className="btn-primary" onClick={handleImport} disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importing...</> : 'Complete Import'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Success */}
      {step === 4 && (
        <div className="card-hero flex flex-col items-center text-center py-20">
          <div className="w-20 h-20 rounded-full bg-success-bg flex items-center justify-center mb-8">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-display-sm mb-4">Import Successful!</h2>
          <p className="text-body-lg text-fg-secondary mb-12 max-w-md">
            Successfully imported attendance for {importStats.imported} students across multiple sessions.
            {importStats.skipped > 0 && ` ${importStats.skipped} rows were skipped due to missing student profiles.`}
          </p>
          <div className="flex gap-4">
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </button>
            <button className="btn-secondary" onClick={() => setStep(1)}>
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
