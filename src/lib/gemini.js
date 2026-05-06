import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY

if (!apiKey) {
  console.warn(
    'Missing VITE_GEMINI_API_KEY in .env.local — CSV import AI features will not work.'
  )
}

/**
 * Gemini AI client — stub for now.
 * Actual usage will be built in Phase 4 (CSV Import Agent).
 */
export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

/**
 * Get the Gemini model configured for structured JSON output.
 * Used by the CSV column-mapping agent in Phase 4.
 */
export function getGeminiModel() {
  if (!genAI) {
    throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env.local')
  }

  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,  // deterministic mapping
    },
  })
}
