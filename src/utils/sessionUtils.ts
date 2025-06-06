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
        if (key && (key.includes('supabase') || key.includes('auth') || key.includes('snapme'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => {
        console.log('🧹 Clearing session key:', key)
        localStorage.removeItem(key)
      })

      // Clear sessionStorage
      const sessionKeysToRemove = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (key.includes('supabase') || key.includes('auth') || key.includes('snapme'))) {
          sessionKeysToRemove.push(key)
        }
      }
      sessionKeysToRemove.forEach(key => {
        console.log('🧹 Clearing session storage key:', key)
        sessionStorage.removeItem(key)
      })
    }
  } catch (error) {
    console.warn('Error clearing session cache:', error)
  }
}

/**
 * Fungsi khusus untuk clear session snapme lama
 */
export const clearSnapmeSessions = () => {
  try {
    if (typeof window !== 'undefined') {
      const keysToRemove = []
      
      // Check localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.includes('snapme')) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => {
        console.log('🧹 Removing old snapme session:', key)
        localStorage.removeItem(key)
      })
      
      // Check sessionStorage
      const sessionKeysToRemove = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.includes('snapme')) {
          sessionKeysToRemove.push(key)
        }
      }
      
      sessionKeysToRemove.forEach(key => {
        console.log('🧹 Removing old snapme session storage:', key)
        sessionStorage.removeItem(key)
      })

      if (keysToRemove.length > 0 || sessionKeysToRemove.length > 0) {
        console.log('✅ Cleared old snapme sessions, total removed:', keysToRemove.length + sessionKeysToRemove.length)
        return true
      }
    }
    return false
  } catch (error) {
    console.warn('Error clearing snapme sessions:', error)
    return false
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
 * Initialize session dengan check for old sessions
 */
export const initializeSession = async () => {
  // Clear old snapme sessions first
  const hadOldSessions = clearSnapmeSessions()
  
  if (hadOldSessions) {
    console.log('🔄 Old sessions cleared, reinitializing auth...')
    // Refresh the page to reinitialize auth properly
    if (typeof window !== 'undefined') {
      window.location.reload()
      return
    }
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error initializing session:', error)
      return null
    }

    if (session) {
      console.log('✅ WedShoot session initialized:', session.user.email)
    } else {
      console.log('ℹ️ No active session found')
    }

    return session
  } catch (error) {
    console.error('Exception in initializeSession:', error)
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

/**
 * Reset aplikasi secara menyeluruh - clear semua data browser
 */
export const resetApplication = () => {
  try {
    if (typeof window !== 'undefined') {
      console.log('🔄 Resetting application completely...')
      
      // Clear all localStorage
      const localStorageKeys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) localStorageKeys.push(key)
      }
      localStorageKeys.forEach(key => {
        console.log('🧹 Removing localStorage key:', key)
        localStorage.removeItem(key)
      })

      // Clear all sessionStorage  
      const sessionStorageKeys = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key) sessionStorageKeys.push(key)
      }
      sessionStorageKeys.forEach(key => {
        console.log('🧹 Removing sessionStorage key:', key)
        sessionStorage.removeItem(key)
      })

      // Clear cookies (optional - be careful with this)
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      })

      console.log('✅ Application reset complete. Reloading page...')
      
      // Reload page after clearing everything
      window.location.reload()
      
      return true
    }
    return false
  } catch (error) {
    console.error('Error resetting application:', error)
    return false
  }
}

/**
 * Debug helper - print semua storage keys
 */
export const debugStorageKeys = () => {
  if (typeof window === 'undefined') return

  console.log('📋 Current Storage Keys:')
  
  console.log('localStorage:')
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      console.log(`  - ${key}`)
    }
  }
  
  console.log('sessionStorage:')
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key) {
      console.log(`  - ${key}`)
    }
  }
} 