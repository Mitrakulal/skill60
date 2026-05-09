import { generateJSON } from './groq.js'
import * as xlsx from 'xlsx'

/**
 * ForgeTrack CSV Import Agent
 *
 * Responsibilities:
 * 1. Parse Excel/CSV data using SheetJS (xlsx)
 * 2. Handle Excel serial date numbers, mixed date formats
 * 3. Use AI (Groq / Llama 3.3) to map arbitrary columns to our schema
 * 4. Detect missing dates, suggest based on class schedule patterns
 * 5. Fuzzy match students against the DB (local, no AI)
 * 6. Detect and prevent duplicate attendance records
 */


/* ─────────────────────────────────────────────
   1. FILE PARSING
   ───────────────────────────────────────────── */

/**
 * Convert an Excel serial date number to a YYYY-MM-DD string.
 * Excel uses Jan 1, 1900 as day 1 (with the Lotus 1-2-3 leap year bug).
 */
function serialToDateStr(serial) {
  const utcDays = Math.floor(serial - 25569)
  const date = new Date(utcDays * 86400000)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Parse an uploaded Excel or CSV file.
 * Returns all sheets with their headers and row data.
 * Handles Excel serial dates, multi-row headers, and empty rows.
 */
export async function parseExcelOrCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = xlsx.read(data, { type: 'array' })

        const sheets = {}
        workbook.SheetNames.forEach(sheetName => {
          const rawRows = xlsx.utils.sheet_to_json(
            workbook.Sheets[sheetName],
            { header: 1, raw: true }
          )

          if (rawRows.length < 2) return

          // Find the actual header row — skip completely empty rows at top
          let headerRowIdx = 0
          for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
            const row = rawRows[i]
            if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
              headerRowIdx = i
              break
            }
          }

          // Check for multi-row headers (e.g., "Day 1" row above "Attendance" row)
          // If the row after header has mostly the same pattern as sub-headers, merge them
          let mergedHeaders = false
          const primaryRow = rawRows[headerRowIdx] || []
          const secondaryRow = rawRows[headerRowIdx + 1] || []

          // Detect multi-row: primary has sparse labels ("Day 1", null, null, "Day 2"...)
          // and secondary has repeated labels ("Attendance", "Knowledge", "Skill"...)
          const primaryNonNull = primaryRow.filter(c => c !== null && c !== undefined && c !== '').length
          const secondaryNonNull = secondaryRow.filter(c => c !== null && c !== undefined && c !== '').length
          const isMultiRow = primaryNonNull > 0 && secondaryNonNull > primaryNonNull &&
            typeof secondaryRow[0] === 'string' && primaryRow.length < secondaryRow.length

          let headers
          let dataStartIdx

          if (isMultiRow) {
            // Merge: "Day 1" + "Attendance" → "Day 1 - Attendance"
            mergedHeaders = true
            let lastGroup = ''
            headers = secondaryRow.map((sub, i) => {
              const group = primaryRow[i]
              if (group !== null && group !== undefined && group !== '') {
                lastGroup = group.toString().trim()
              }
              const subLabel = (sub !== null && sub !== undefined && sub !== '')
                ? sub.toString().trim()
                : `Col_${i + 1}`

              if (lastGroup && subLabel !== lastGroup) {
                return `${lastGroup} - ${subLabel}`
              }
              return subLabel
            })
            dataStartIdx = headerRowIdx + 2
          } else {
            headers = primaryRow.map((h, idx) => {
              if (h === null || h === undefined || h === '') return `Column_${idx + 1}`
              // Convert Excel serial dates in headers
              if (typeof h === 'number' && h > 40000 && h < 55000) {
                return serialToDateStr(h)
              }
              return h.toString().trim()
            })
            dataStartIdx = headerRowIdx + 1
          }

          const dataRows = rawRows.slice(dataStartIdx)
            .filter(row => {
              if (!row || row.length === 0) return false
              return row.some(cell => cell !== null && cell !== undefined && cell !== '')
            })
            .filter(row => {
              // Skip summary rows
              const firstNonEmpty = row.find(cell => typeof cell === 'string' && cell.trim())
              if (firstNonEmpty) {
                const lower = firstNonEmpty.toLowerCase().trim()
                if (['total', 'average', 'sum', 'grand total'].includes(lower)) return false
              }
              return true
            })
            .map(row => {
              const obj = {}
              headers.forEach((h, i) => {
                obj[h] = row[i] !== undefined ? row[i] : null
              })
              return obj
            })

          if (dataRows.length > 0) {
            sheets[sheetName] = {
              headers,
              data: dataRows,
              rowCount: dataRows.length,
              mergedHeaders,
            }
          }
        })

        resolve({
          sheetNames: Object.keys(sheets),
          sheets,
        })
      } catch (err) {
        reject(new Error('Failed to parse file: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}


/* ─────────────────────────────────────────────
   2. AI COLUMN MAPPING (Groq / Llama 3.3)
   ───────────────────────────────────────────── */

const MAPPING_SYSTEM_PROMPT = `You are a data mapping agent for ForgeTrack, a bootcamp attendance tracking system.

You will receive spreadsheet column headers and sample data rows. Your job is to map each column to our internal data model.

OUR DATA MODEL FIELDS:
- student_name: The full name of the student
- usn: University Seat Number (e.g., 4SF24CI020, 4SH24CS001)
- email: Student email address
- admission_number: College admission number
- branch_code: Department code (CS, CI, AI, IS, etc.)
- IGNORE: Columns not needed (serial numbers, invite links, scores, skill marks, knowledge marks, etc.)

ATTENDANCE / SESSION DATE COLUMNS:
Columns that contain boolean attendance data (TRUE/FALSE, true/false, P/A, 1/0, Yes/No) are SESSION ATTENDANCE columns.

For each attendance column:
1. If the header IS a recognizable date (in ANY format: DD/MM/YY, DD/M/YY, DD-MM-YY, YYYY-MM-DD, "1 Apr 26", etc.), map it as:
   "date:YYYY-MM-DD"

2. If the header is already in YYYY-MM-DD format, keep it as-is: "date:YYYY-MM-DD"

3. If the header is NOT a date (e.g., "Day 1", "Session 5", "Day 1 - Attendance", empty, or any non-date text) BUT the column contains attendance-like boolean data, map it as:
   "missing_date:ORIGINAL_HEADER"

IMPORTANT DATE PARSING RULES (INDIAN STANDARD):
- We use DD-MM-YY or DD/MM/YY. 
- ALWAYS interpret the FIRST number as the DAY and the SECOND as the MONTH.
- Example: 15/4/26 MUST be 2026-04-15.
- Example: 05-12-25 MUST be 2025-12-05.
- Example: 30/04/26 MUST be 2026-04-30.
- If the year is 2-digit (25, 26), it is 2025, 2026.
- If the header is a raw number like 46238, it is an Excel Serial Date. DO NOT try to parse it as DD-MM-YY; just leave it for the system to handle.

OUTPUT JSON FORMAT (strict):
{
  "mappings": {
    "Header1": "student_name",
    "Header2": "usn",
    "Header3": "IGNORE",
    "15/4/26": "date:2026-04-15",
    "Day 1 - Attendance": "missing_date:Day 1 - Attendance",
    "Column_25": "missing_date:Column_25"
  },
  "layout": "pivoted",
  "attendance_convention": "TRUE/FALSE",
  "suggested_class_days": "Tuesdays and Thursdays",
  "reasoning": "Brief explanation of mapping decisions"
}`

/**
 * Send headers + sample data to AI and get column mapping.
 * Returns structured JSON with mappings, layout type, attendance convention, etc.
 */
export async function getColumnMapping(headers, sampleRows) {
  const samples = sampleRows.slice(0, 3).map(row => {
    const obj = {}
    headers.forEach(h => { obj[h] = row[h] })
    return obj
  })

  const prompt = `Analyze these spreadsheet headers and sample data, then return the column mapping JSON.

HEADERS:
${JSON.stringify(headers)}

SAMPLE DATA (first ${samples.length} rows):
${JSON.stringify(samples, null, 2)}`

  let text = await generateJSON(MAPPING_SYSTEM_PROMPT, prompt)
  text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')

  try {
    const parsed = JSON.parse(text)
    return {
      mappings: parsed.mappings || {},
      layout: parsed.layout || 'pivoted',
      attendanceConvention: parsed.attendance_convention || 'TRUE/FALSE',
      suggestedClassDays: parsed.suggested_class_days || '',
      reasoning: parsed.reasoning || '',
    }
  } catch (e) {
    console.error('Failed to parse AI response:', text)
    throw new Error('AI failed to generate a valid mapping. Please try again.')
  }
}


/* ─────────────────────────────────────────────
   3. AI DATE RESOLUTION
   ───────────────────────────────────────────── */

const DATE_RESOLUTION_PROMPT = `You are a date inference agent. Given a list of known session dates and a list of unlabelled session headers (like "Day 1", "Day 2", or empty column names), figure out what dates the unlabelled sessions likely correspond to.

Use these clues:
1. The known dates tell you the overall time range and frequency of classes
2. The user has told you which days of the week classes usually happen
3. "Day 1" should be the earliest session, "Day 2" the next, etc.
4. If headers are just empty/numbered columns, assign dates chronologically

OUTPUT JSON FORMAT (strict):
{
  "resolved_dates": {
    "Day 1 - Attendance": "2025-08-04",
    "Day 2 - Attendance": "2025-08-06",
    "Column_25": "2026-03-15"
  },
  "reasoning": "Brief explanation"
}`

/**
 * Ask AI to resolve missing dates based on known dates and class day pattern.
 */
export async function resolveMissingDates(missingHeaders, knownDates, classDays) {
  const prompt = `Resolve the missing dates for these session headers.

MISSING HEADERS (need dates assigned):
${JSON.stringify(missingHeaders)}

KNOWN SESSION DATES (already identified from other columns):
${JSON.stringify(knownDates.sort())}

USER SAYS CLASSES HAPPEN ON: ${classDays || 'Not specified — infer from the known dates pattern'}

Assign a YYYY-MM-DD date to each missing header.`

  let text = await generateJSON(DATE_RESOLUTION_PROMPT, prompt)
  text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')

  try {
    const parsed = JSON.parse(text)
    return {
      resolvedDates: parsed.resolved_dates || {},
      reasoning: parsed.reasoning || '',
    }
  } catch (e) {
    console.error('Failed to parse date resolution response:', text)
    throw new Error('AI failed to resolve missing dates. Please assign them manually.')
  }
}


/* ─────────────────────────────────────────────
   4. STUDENT MATCHING (Fuzzy + Exact — local, no AI)
   ───────────────────────────────────────────── */

/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[m][n]
}

function similarity(a, b) {
  if (!a || !b) return 0
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen
}

/**
 * Match each CSV row to a student in the database.
 *
 * Matching priority:
 * 1. Exact USN match (case-insensitive)
 * 2. Exact name match (case-insensitive)
 * 3. Fuzzy name match (≥ 80% similarity)
 */
export function matchStudents(csvRows, dbStudents, mappings) {
  const nameKey = Object.keys(mappings).find(k => mappings[k] === 'student_name')
  const usnKey = Object.keys(mappings).find(k => mappings[k] === 'usn')

  return csvRows.map(row => {
    const csvUsn = usnKey ? (row[usnKey]?.toString().trim().toUpperCase() || null) : null
    const csvName = nameKey ? (row[nameKey]?.toString().trim() || null) : null

    let matched = null
    let matchType = 'none'
    let matchScore = 0

    // Priority 1: Exact USN match
    if (csvUsn) {
      matched = dbStudents.find(s => s.usn?.toUpperCase() === csvUsn)
      if (matched) { matchType = 'usn_exact'; matchScore = 1 }
    }

    // Priority 2: Exact name match
    if (!matched && csvName) {
      matched = dbStudents.find(s => s.name?.toLowerCase() === csvName.toLowerCase())
      if (matched) { matchType = 'name_exact'; matchScore = 1 }
    }

    // Priority 3: Fuzzy name match
    if (!matched && csvName) {
      let bestMatch = null, bestScore = 0
      for (const student of dbStudents) {
        const score = similarity(csvName, student.name)
        if (score > bestScore && score >= 0.8) {
          bestScore = score
          bestMatch = student
        }
      }
      if (bestMatch) {
        matched = bestMatch
        matchType = 'name_fuzzy'
        matchScore = bestScore
      }
    }

    return {
      ...row,
      _matchedStudent: matched,
      _status: matched ? 'matched' : 'unmatched',
      _matchType: matchType,
      _matchScore: matchScore,
      _csvName: csvName,
      _csvUsn: csvUsn,
    }
  })
}


/* ─────────────────────────────────────────────
   5. DUPLICATE DETECTION
   ───────────────────────────────────────────── */

/**
 * Check for duplicate attendance records against existing DB records.
 * Returns a Set of "studentId-date" keys that already exist.
 */
export async function getExistingAttendanceKeys(supabase) {
  const { data: existing, error } = await supabase
    .from('attendance')
    .select('student_id, session_id, sessions!inner(date)')

  if (error) {
    console.warn('Could not fetch existing attendance for dedup:', error)
    return new Set()
  }

  return new Set(
    (existing || []).map(a => `${a.student_id}-${a.sessions.date}`)
  )
}

/**
 * Detect duplicates within a dataset (e.g., across multiple selected sheets).
 * Returns a Map: rowIndex → array of { date, firstRow } duplicates.
 */
export function detectIntraFileDuplicates(matchedData, mappings) {
  const dateCols = Object.entries(mappings)
    .filter(([_, v]) => v.startsWith('date:'))
    .map(([header, val]) => ({ header, date: val.replace('date:', '') }))

  const seen = new Map()
  const duplicateRows = new Map()

  matchedData.forEach((row, rowIdx) => {
    if (!row._matchedStudent) return

    dateCols.forEach(({ header, date }) => {
      const val = row[header]
      if (val === null || val === undefined || val === '') return

      const key = `${row._matchedStudent.id}-${date}`
      if (seen.has(key)) {
        if (!duplicateRows.has(rowIdx)) duplicateRows.set(rowIdx, [])
        duplicateRows.get(rowIdx).push({ date, firstRow: seen.get(key) })
      } else {
        seen.set(key, rowIdx)
      }
    })
  })

  return duplicateRows
}


/* ─────────────────────────────────────────────
   6. ATTENDANCE VALUE PARSING
   ───────────────────────────────────────────── */

/**
 * Normalize an attendance cell value to boolean or null.
 * Returns: true (present), false (absent), or null (no record / empty).
 */
export function parseAttendanceValue(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'boolean') return value

  const v = value.toString().trim().toLowerCase()

  // Present indicators
  if (['true', 'p', 'present', '1', 'yes', 'y'].includes(v)) return true

  // Absent indicators
  if (['false', 'a', 'absent', '0', 'no', 'n'].includes(v)) return false

  return null
}
