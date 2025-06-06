import { supabase } from '@/lib/supabase'
import { shouldRetryError, isAuthError } from './errorBoundary'

/**
 * Utility untuk clear session cache dan refresh auth state
 */
export const clearSessionCache = () => {
  try {
    // Clear localStorage items terkait auth
    if (typeof window !== 'undefined') {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('supabase') || key.includes('auth'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))

      // Clear sessionStorage
      const sessionKeysToRemove = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (key.includes('supabase') || key.includes('auth'))) {
          sessionKeysToRemove.push(key)
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key))
    }
  } catch (error) {
    console.warn('Error clearing session cache:', error)
  }
}

/**
 * Force refresh current session - hanya jika session ada
 */
export const refreshSession = async () => {
  try {
    // Cek dulu apakah ada session sebelum refresh
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    
    if (!currentSession) {
      console.log('No session to refresh')
      return { success: false, error: new Error('No session to refresh') }
    }

    const { data, error } = await supabase.auth.refreshSession()
    if (error) {
      console.error('Error refreshing session:', error)
      return { success: false, error }
    }
    return { success: true, data }
  } catch (error) {
    console.error('Error refreshing session:', error)
    return { success: false, error }
  }
}

/**
 * Check if session exists and is expired
 */
export const isSessionExpired = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    // Jika ada error atau tidak ada session, return true
    if (error || !session) return true
    
    const now = Math.floor(Date.now() / 1000)
    return session.expires_at ? now >= session.expires_at : false
  } catch (error) {
    console.error('Error checking session expiry:', error)
    return true
  }
}

/**
 * Safe session getter dengan retry
 */
export const getSafeSession = async (retryCount = 0): Promise<any> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      // Cek apakah boleh retry atau tidak
      if (retryCount < 2 && shouldRetryError(error, 'getSafeSession')) {
        // Retry sekali lagi setelah 500ms
        await new Promise(resolve => setTimeout(resolve, 500))
        return getSafeSession(retryCount + 1)
      }
      
      // Jika auth error, return null daripada throw
      if (isAuthError(error)) {
        console.log('Auth error in getSafeSession, returning null')
        return null
      }
      
      throw error
    }
    
    return session
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

/**
 * Initialize session dengan error recovery
 */
export const initializeSession = async () => {
  try {
    // Get session dulu tanpa refresh
    const currentSession = await getSafeSession()
    
    // Jika tidak ada session sama sekali, return null (user belum login)
    if (!currentSession) {
      console.log('No session found - user not logged in')
      return null
    }
    
    // Cek apakah session expired
    const now = Math.floor(Date.now() / 1000)
    const isExpired = currentSession.expires_at ? now >= currentSession.expires_at : false
    
    if (isExpired) {
      console.log('Session expired, attempting refresh...')
      const refreshResult = await refreshSession()
      
      if (!refreshResult.success) {
        console.log('Session refresh failed, clearing cache...')
        clearSessionCache()
        return null
      }
      
      // Get session lagi setelah refresh
      return await getSafeSession()
    }
    
    return currentSession
  } catch (error) {
    console.error('Error initializing session:', error)
    clearSessionCache()
    return null
  }
}

/**
 * Debug session state
 */
export const debugSessionState = async () => {
  if (process.env.NODE_ENV === 'production') return
  
  try {
    const session = await getSafeSession()
    console.log('🔍 Session Debug:', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      expiresAt: session?.expires_at,
      isExpired: session ? Math.floor(Date.now() / 1000) >= (session.expires_at || 0) : 'no session'
    })
  } catch (error) {
    console.error('Error debugging session:', error)
  }
} 