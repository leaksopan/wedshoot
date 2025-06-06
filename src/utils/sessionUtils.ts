import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'
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
        sessionStorage.removeItem(key)
      })
    }
  } catch {
    // Error handled silently
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
        sessionStorage.removeItem(key)
      })

      if (keysToRemove.length > 0 || sessionKeysToRemove.length > 0) {
        return true
      }
    }
    return false
  } catch {
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
      return { success: false, error: new Error('No session to refresh') }
    }

    const { data, error } = await supabase.auth.refreshSession()
    if (error) {
      return { success: false, error }
    }
    return { success: true, data }
  } catch (error) {
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
  } catch {
    return true
  }
}

/**
 * Safe session getter dengan retry
 */
export const getSafeSession = async (retryCount = 0): Promise<Session | null> => {
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
        return null
      }
      
      throw error
    }
    
    return session
  } catch {
    return null
  }
}

/**
 * Initialize session dengan check for old sessions - IMPROVED
 */
export const initializeSession = async () => {
  // Clear old snapme sessions first
  const hadOldSessions = clearSnapmeSessions()
  
  if (hadOldSessions) {
    // Don't auto reload, just clear and continue
    console.log('Cleared old snapme sessions')
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.warn('Session initialization error:', error)
      // Clear corrupt session data
      clearSessionCache()
      return null
    }
    
    // Check if session is expired
    if (session && session.expires_at) {
      const now = Math.floor(Date.now() / 1000)
      if (now >= session.expires_at) {
        console.log('Session expired, clearing...')
        clearSessionCache()
        return null
      }
    }
    
    return session
  } catch (error) {
    console.warn('Session get error:', error)
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
    await getSafeSession()
    // Debug info available in development only
  } catch {
    // Error handled silently
  }
}

/**
 * Reset aplikasi secara menyeluruh - clear semua data browser
 */
export const resetApplication = () => {
  try {
    if (typeof window !== 'undefined') {
      
      // Clear all localStorage
      const localStorageKeys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) localStorageKeys.push(key)
      }
      localStorageKeys.forEach(key => localStorage.removeItem(key))
      
      // Clear all sessionStorage
      const sessionStorageKeys = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key) sessionStorageKeys.push(key)
      }
      sessionStorageKeys.forEach(key => sessionStorage.removeItem(key))
      
      // Clear cookies via Supabase
      supabase.auth.signOut({ scope: 'local' }).then(() => {
        // Force reload setelah clear
        window.location.reload()
      }).catch(() => {
        // Force reload even if signout fails
        window.location.reload()
      })
    }
  } catch (error) {
    console.warn('Reset application error:', error)
    // Force reload anyway
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }
}

/**
 * Force fix stuck session - untuk debug
 */
export const forceFixStuckSession = async () => {
  if (process.env.NODE_ENV !== 'development') return
  
  try {
    console.log('🔧 Force fixing stuck session...')
    
    // 1. Clear all storage
    clearSessionCache()
    clearSnapmeSessions()
    
    // 2. Force signout dari supabase
    await supabase.auth.signOut({ scope: 'global' })
    
    // 3. Clear cookies
    if (typeof document !== 'undefined') {
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=")
        const name = eqPos > -1 ? c.substr(0, eqPos) : c
        if (name.trim().includes('supabase') || name.trim().includes('auth')) {
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
        }
      })
    }
    
    console.log('✅ Session reset completed, reloading...')
    
    // 4. Force reload
    setTimeout(() => {
      window.location.reload()
    }, 500)
    
  } catch (error) {
    console.error('❌ Force fix error:', error)
    window.location.reload()
  }
}

/**
 * Debug storage keys - untuk troubleshooting
 */
export const debugStorageKeys = () => {
  if (process.env.NODE_ENV !== 'development') return
  
  try {
    if (typeof window !== 'undefined') {
      console.group('🔍 Storage Debug Info')
      
      // localStorage
      console.log('📦 LocalStorage Keys:')
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          const value = localStorage.getItem(key)
          if (key.includes('supabase') || key.includes('auth') || key.includes('snapme')) {
            console.log(`  🔑 ${key}:`, value ? value.substring(0, 100) + '...' : 'null')
          }
        }
      }
      
      // sessionStorage
      console.log('💾 SessionStorage Keys:')
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key) {
          const value = sessionStorage.getItem(key)
          if (key.includes('supabase') || key.includes('auth') || key.includes('snapme')) {
            console.log(`  🔑 ${key}:`, value ? value.substring(0, 100) + '...' : 'null')
          }
        }
      }
      
      // Current session status
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        console.log('🔐 Current Session:', session ? 'EXISTS' : 'NULL')
        console.log('❌ Session Error:', error)
        if (session) {
          console.log('👤 User ID:', session.user?.id)
          console.log('📧 Email:', session.user?.email)
          console.log('⏰ Expires:', new Date(session.expires_at! * 1000))
        }
        console.groupEnd()
      }).catch(err => {
        console.log('❌ Session Check Error:', err)
        console.groupEnd()
      })
    }
  } catch (error) {
    console.error('Debug error:', error)
  }
} 