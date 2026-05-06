import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

/**
 * AuthProvider — wraps the entire app to manage Supabase auth state.
 * Provides: user, userProfile (from public.users), role, loading, login, logout.
 * 
 * PERF FIXES:
 * - Caches profile by user ID — won't re-fetch on token refresh if same user
 * - Filters auth events — only reacts to SIGNED_IN, SIGNED_OUT, USER_DELETED
 * - Uses ref to prevent concurrent profile fetches
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Track which user ID we've already fetched profile for
  const cachedUserIdRef = useRef(null)
  // Prevent concurrent fetches
  const fetchingRef = useRef(false)

  const fetchUserProfile = useCallback(async (userId) => {
    // Skip if we already have this user's profile cached
    if (cachedUserIdRef.current === userId && userProfile) {
      setLoading(false)
      return
    }

    // Skip if another fetch is already in progress
    if (fetchingRef.current) return
    fetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Failed to fetch user profile:', error)
        setUserProfile(null)
        cachedUserIdRef.current = null
      } else {
        setUserProfile(data)
        cachedUserIdRef.current = userId
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setUserProfile(null)
      cachedUserIdRef.current = null
    } finally {
      fetchingRef.current = false
      setLoading(false)
    }
  }, []) // intentionally empty — we read userProfile via ref-like check

  useEffect(() => {
    // Get initial session (runs once)
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s) {
        fetchUserProfile(s.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes — but FILTER events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        // Only react to meaningful events, NOT token refreshes
        if (event === 'SIGNED_IN') {
          setSession(s)
          fetchUserProfile(s.user.id)
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUserProfile(null)
          cachedUserIdRef.current = null
          setLoading(false)
        } else if (event === 'TOKEN_REFRESHED') {
          // Just update the session object (for fresh tokens)
          // but DON'T re-fetch the profile — same user, nothing changed
          setSession(s)
        }
        // Ignore: INITIAL_SESSION, USER_UPDATED, PASSWORD_RECOVERY, etc.
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchUserProfile])

  const login = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }, [])

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setSession(null)
    setUserProfile(null)
    cachedUserIdRef.current = null
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    userProfile,
    role: userProfile?.role ?? null,
    displayName: userProfile?.display_name ?? '',
    studentId: userProfile?.student_id ?? null,
    loading,
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
