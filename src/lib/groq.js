/**
 * ForgeTrack AI Client — Groq (Llama 3.3 70B)
 *
 * Uses Groq's OpenAI-compatible API for fast structured JSON inference.
 * Free tier: 30 RPM, 14,400 requests/day — generous enough for import workflows.
 *
 * Includes retry with exponential backoff for 429 rate-limit errors.
 */

const GROQ_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROQ_API_KEY) 
  || (typeof process !== 'undefined' && process.env?.VITE_GROQ_API_KEY)
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL_ID = 'llama-3.3-70b-versatile'

const MAX_RETRIES = 3
const INITIAL_DELAY_MS = 2000

if (!GROQ_API_KEY) {
  console.warn('Missing VITE_GROQ_API_KEY in .env.local — AI features will not work.')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Send a structured JSON request to Groq.
 * Retries up to MAX_RETRIES times on 429 with exponential backoff.
 *
 * @param {string} systemPrompt - System instructions
 * @param {string} userPrompt   - User message
 * @returns {Promise<string>}   - Raw text response from the model
 */
export async function generateJSON(systemPrompt, userPrompt) {
  if (!GROQ_API_KEY) {
    throw new Error('AI API key not configured. Set VITE_GROQ_API_KEY in .env.local')
  }

  let lastError = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1)
      console.log(`⏳ Rate limited — retrying in ${(delay / 1000).toFixed(0)}s (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`)
      await sleep(delay)
    }

    const response = await fetch(GROQ_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    })

    if (response.status === 429) {
      lastError = 'Rate limited (429)'
      console.warn(`⚠️ ${lastError}`)
      continue
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = err?.error?.message || `HTTP ${response.status}`
      throw new Error(`AI request failed: ${msg}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content?.trim()

    if (!text) {
      throw new Error('AI returned an empty response. Please try again.')
    }

    if (attempt > 0) {
      console.log(`✅ AI request succeeded on attempt ${attempt + 1}`)
    }

    return text
  }

  throw new Error(
    `AI request failed after ${MAX_RETRIES + 1} attempts due to rate limiting. Please wait a moment and try again.`
  )
}
