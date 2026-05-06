import { getGeminiModel } from './gemini'
import Papa from 'papaparse'

/**
 * ForgeTrack CSV Import Agent
 * 
 * Responsibilities:
 * 1. Parse CSV/Excel data
 * 2. Use Gemini to map arbitrary columns to our schema
 * 3. Identify date columns for multi-session attendance
 * 4. Fuzzy match students
 */

export async function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results),
      error: (error) => reject(error),
    })
  })
}

const SYSTEM_PROMPT = `
You are an AI data mapping agent for ForgeTrack. 
Your task is to map column headers from a bootcamp attendance CSV to our internal data model.

OUR DATA MODEL:
- student_name: The name of the student
- usn: University Seat Number (e.g., 4SH24CS001)
- email: Student email
- branch_code: CS, AI, IS, etc.
- attendance_date: A column representing attendance for a specific date.

RULES:
1. Return a JSON object mapping input headers to our model keys.
2. For date columns, map the header to "date:YYYY-MM-DD" if you can parse it, or "date:original_header".
3. If a column is irrelevant, map it to "IGNORE".
4. Be aggressive in identifying date columns (e.g., "05/11", "Nov 5", "5-Nov-25").

EXAMPLE INPUT: ["SL No", "Student Name", "USN", "05/11", "06/11"]
EXAMPLE OUTPUT: {
  "SL No": "IGNORE",
  "Student Name": "student_name",
  "USN": "usn",
  "05/11": "date:2025-11-05",
  "06/11": "date:2025-11-06"
}
`

export async function getColumnMapping(headers) {
  const model = getGeminiModel()
  const prompt = `Identify mappings for these headers: ${JSON.stringify(headers)}`
  
  const result = await model.generateContent([SYSTEM_PROMPT, prompt])
  const response = await result.response
  const text = response.text()
  
  try {
    return JSON.parse(text)
  } catch (e) {
    console.error('Failed to parse Gemini response:', text)
    throw new Error('AI failed to generate a valid mapping.')
  }
}

/**
 * Fuzzy match students from CSV against DB students.
 * Currently doing exact USN match or exact Name match.
 */
export function matchStudents(csvRows, dbStudents, mapping) {
  const nameKey = Object.keys(mapping).find(k => mapping[k] === 'student_name')
  const usnKey = Object.keys(mapping).find(k => mapping[k] === 'usn')

  return csvRows.map(row => {
    const csvUsn = usnKey ? row[usnKey]?.toString().trim().toUpperCase() : null
    const csvName = nameKey ? row[nameKey]?.toString().trim() : null

    let matched = null
    if (csvUsn) {
      matched = dbStudents.find(s => s.usn.toUpperCase() === csvUsn)
    }
    
    if (!matched && csvName) {
      matched = dbStudents.find(s => s.name.toLowerCase() === csvName.toLowerCase())
    }

    return {
      ...row,
      _matchedStudent: matched,
      _status: matched ? 'matched' : 'unmatched',
    }
  })
}
