/**
 * Session Management Utilities
 * Mengelola user sessions dan prevent multiple login sessions
 */

export interface SessionInfo {
  userId: string
  sessionId: string
  timestamp: number
  expiresAt: number
  isActive: boolean
}

const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const SESSION_STORAGE_KEY = 'wedshoot-session-info'

class SessionManager {
  private static instance: SessionManager
  private currentSession: SessionInfo | null = null
  private sessionTimeouts = new Map<string, NodeJS.Timeout>()

  private constructor() {
    this.loadSessionFromStorage()
    this.setupStorageListener()
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  // Load session dari storage
  private loadSessionFromStorage() {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY)
      if (stored) {
        const sessionInfo: SessionInfo = JSON.parse(stored)
        
        // Check if session is still valid
        if (Date.now() - sessionInfo.timestamp < SESSION_TIMEOUT) {
          this.currentSession = sessionInfo
          console.log('📋 Loaded existing session:', sessionInfo.userId)
        } else {
          console.log('⏰ Session expired, clearing...')
          this.clearSession()
        }
      }
    } catch (err) {
      console.warn('⚠️ Error loading session from storage:', err)
      this.clearSession()
    }
  }

  // Setup listener untuk storage changes (untuk detect concurrent sessions)
  private setupStorageListener() {
    if (typeof window === 'undefined') return

    window.addEventListener('storage', (e) => {
      if (e.key === SESSION_STORAGE_KEY) {
        console.log('🔄 Session storage changed in another tab')
        
        if (e.newValue) {
          try {
            const newSession: SessionInfo = JSON.parse(e.newValue)
            
            // Jika ada session baru dan berbeda dari current session
            if (this.currentSession && newSession.userId !== this.currentSession.userId) {
              console.log('⚠️ Different user session detected, cleaning up current session')
              this.handleSessionConflict()
            }
          } catch (err) {
            console.warn('⚠️ Error parsing session from storage event:', err)
          }
        } else {
          // Session cleared in another tab
          console.log('🧹 Session cleared in another tab')
          this.currentSession = null
        }
      }
    })
  }

  // Handle session conflict (another user login di tab lain)
  private handleSessionConflict() {
    console.log('🚨 Session conflict detected, forcing cleanup')
    
    // Clear current session
    this.currentSession = null
    
    // Clear all timeouts
    this.sessionTimeouts.forEach(timeout => clearTimeout(timeout))
    this.sessionTimeouts.clear()
    
    // Notify app about conflict
    window.dispatchEvent(new CustomEvent('session-conflict', {
      detail: { reason: 'concurrent-user-login' }
    }))
  }

  // Set session info
  setSession(sessionInfo: SessionInfo): boolean {
    try {
      // Check for existing different session
      if (this.currentSession && this.currentSession.userId !== sessionInfo.userId) {
        console.log('🔄 Different user session, clearing previous')
        this.clearSession()
      }

      this.currentSession = {
        ...sessionInfo,
        timestamp: Date.now()
      }

      // Save to storage
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.currentSession))
      
      // Set auto-expire timeout
      this.setSessionTimeout(sessionInfo.userId)
      
      console.log('✅ Session set for user:', sessionInfo.userId)
      return true
    } catch (err) {
      console.error('❌ Error setting session:', err)
      return false
    }
  }

  // Get current session
  getSession(): SessionInfo | null {
    // Check if session is still valid
    if (this.currentSession) {
      const isExpired = Date.now() - this.currentSession.timestamp > SESSION_TIMEOUT
      
      if (isExpired) {
        console.log('⏰ Current session expired')
        this.clearSession()
        return null
      }
      
      // Refresh timestamp
      this.currentSession.timestamp = Date.now()
      this.saveSessionToStorage()
    }
    
    return this.currentSession
  }

  // Check if user has valid session
  hasValidSession(userId?: string): boolean {
    const session = this.getSession()
    
    if (!session) return false
    
    if (userId && session.userId !== userId) {
      console.log('⚠️ Session user mismatch:', { current: session.userId, expected: userId })
      return false
    }
    
    return true
  }

  // Clear session
  clearSession(): void {
    console.log('🧹 Clearing session...')
    
    // Clear from memory
    this.currentSession = null
    
    // Clear timeouts
    this.sessionTimeouts.forEach(timeout => clearTimeout(timeout))
    this.sessionTimeouts.clear()
    
    // Clear from storage
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch (err) {
      console.warn('⚠️ Error clearing session from storage:', err)
    }
  }

  // Set session timeout
  private setSessionTimeout(userId: string) {
    // Clear existing timeout
    const existingTimeout = this.sessionTimeouts.get(userId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      console.log('⏰ Session timeout for user:', userId)
      this.clearSession()
      
      // Notify app about timeout
      window.dispatchEvent(new CustomEvent('session-timeout', {
        detail: { userId }
      }))
    }, SESSION_TIMEOUT)
    
    this.sessionTimeouts.set(userId, timeout)
  }

  // Save current session to storage
  private saveSessionToStorage() {
    if (!this.currentSession) return
    
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.currentSession))
    } catch (err) {
      console.warn('⚠️ Error saving session to storage:', err)
    }
  }

  // Get session stats for debugging
  getSessionStats() {
    return {
      hasSession: !!this.currentSession,
      userId: this.currentSession?.userId,
      sessionAge: this.currentSession ? Date.now() - this.currentSession.timestamp : 0,
      activeTimeouts: this.sessionTimeouts.size
    }
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance()

// Helper functions
export const setUserSession = (sessionInfo: SessionInfo): boolean => {
  return sessionManager.setSession(sessionInfo)
}

export const getUserSession = (): SessionInfo | null => {
  return sessionManager.getSession()
}

export const hasValidUserSession = (userId?: string): boolean => {
  return sessionManager.hasValidSession(userId)
}

export const clearUserSession = (): void => {
  sessionManager.clearSession()
}

export const getSessionStats = () => {
  return sessionManager.getSessionStats()
}

// Hook untuk React components
export const useSessionManager = () => {
  return {
    setSession: setUserSession,
    getSession: getUserSession,
    hasValidSession: hasValidUserSession,
    clearSession: clearUserSession,
    getStats: getSessionStats
  }
} 