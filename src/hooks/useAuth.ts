'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types/auth.types'
import { setUserSession, clearUserSession, hasValidUserSession } from '@/utils/sessionManager'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  isAuthenticated: boolean
  loading: boolean
  sessionId: string | null
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    isAuthenticated: false,
    loading: true,
    sessionId: null
  })
  
  const initializationRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup session timeout
  const clearSessionTimeout = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current)
      sessionTimeoutRef.current = null
    }
  }, [])

  // Set session timeout untuk auto-cleanup
  const setSessionTimeout = useCallback(() => {
    clearSessionTimeout()
    sessionTimeoutRef.current = setTimeout(() => {
      console.log('🕐 Session timeout, clearing auth state')
      setAuthState(prev => ({
        ...prev,
        user: null,
        profile: null,
        isAuthenticated: false,
        sessionId: null
      }))
    }, 30 * 60 * 1000) // 30 minutes
  }, [clearSessionTimeout])

  // Load user profile with retry mechanism
  const loadUserProfile = useCallback(async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    const maxRetries = 3
    
    try {
      console.log(`👤 Loading profile for user: ${userId} (attempt ${retryCount + 1})`)
      
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116' && retryCount < maxRetries) {
          console.log(`⚠️ Profile not found, retrying in ${(retryCount + 1) * 1000}ms...`)
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000))
          return loadUserProfile(userId, retryCount + 1)
        }
        
        console.error('❌ Error loading profile:', error.message)
        return null
      }

      return profile
    } catch (err) {
      console.error('❌ Exception loading profile:', err)
      return null
    }
  }, [])

  // Handle auth state change dengan improved error handling
  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    console.log('🔄 Auth state change:', { event, hasSession: !!session, userId: session?.user?.id })
    
    try {
      if (session?.user) {
        setAuthState(prev => ({
          ...prev,
          loading: true
        }))
        
        const profile = await loadUserProfile(session.user.id)
        
        const sessionId = session.access_token.substring(0, 10)
        
        setAuthState({
          user: session.user,
          profile,
          isAuthenticated: true,
          loading: false,
          sessionId
        })
        
        // Set session in session manager
        setUserSession({
          userId: session.user.id,
          sessionId,
          timestamp: Date.now(),
          expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
          isActive: true
        })
        
        setSessionTimeout()
        
        console.log('✅ Auth state updated:', {
          userId: session.user.id,
          email: session.user.email,
          hasProfile: !!profile,
          isVendor: profile?.is_vendor,
          sessionValid: hasValidUserSession(session.user.id)
        })
      } else {
        clearSessionTimeout()
        clearUserSession() // Clear session manager
        
        setAuthState({
          user: null,
          profile: null,
          isAuthenticated: false,
          loading: false,
          sessionId: null
        })
        
        console.log('🚪 User signed out')
      }
    } catch (error) {
      console.error('❌ Error in auth state change:', error)
      setAuthState(prev => ({
        ...prev,
        loading: false
      }))
    }
  }, [loadUserProfile, setSessionTimeout, clearSessionTimeout])

  // Initialize auth dengan proper cleanup
  const initializeAuth = useCallback(async () => {
    if (initializationRef.current) {
      console.log('⏭️ Auth already initializing, skipping...')
      return
    }
    
    initializationRef.current = true
    console.log('🚀 Initializing auth...')
    
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Error getting session:', error.message)
        setAuthState(prev => ({ ...prev, loading: false }))
        return
      }
      
      // Handle initial session
      await handleAuthStateChange('INITIAL_SESSION', session)
      
      // Setup auth listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange)
      
      // Store cleanup function
      cleanupRef.current = () => {
        subscription.unsubscribe()
        clearSessionTimeout()
        console.log('🧹 Auth cleanup completed')
      }
      
    } catch (error) {
      console.error('❌ Auth initialization error:', error)
      setAuthState(prev => ({ ...prev, loading: false }))
    }
  }, [handleAuthStateChange, clearSessionTimeout])

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth()
    
    // Setup session conflict listener - hanya log untuk now
    const handleSessionConflict = () => {
      console.log('🚨 Session conflict detected, clearing auth state...')
      setAuthState({
        user: null,
        profile: null,
        isAuthenticated: false,
        loading: false,
        sessionId: null
      })
    }
    
    const handleSessionTimeout = () => {
      console.log('⏰ Session timeout, clearing auth state...')
      setAuthState({
        user: null,
        profile: null,
        isAuthenticated: false,
        loading: false,
        sessionId: null
      })
    }
    
    window.addEventListener('session-conflict', handleSessionConflict)
    window.addEventListener('session-timeout', handleSessionTimeout)
    
    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
      window.removeEventListener('session-conflict', handleSessionConflict)
      window.removeEventListener('session-timeout', handleSessionTimeout)
    }
  }, [initializeAuth])

  // Sign in function
  const signIn = useCallback(async (email: string, password: string) => {
    console.log('🔐 Signing in user:', email)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('❌ Sign in error:', error.message)
      throw error
    }

    return data
  }, [])

  // Sign up function
  const signUp = useCallback(async (email: string, password: string, userData?: Partial<UserProfile>) => {
    console.log('📝 Signing up user:', email)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })

    if (error) {
      console.error('❌ Sign up error:', error.message)
      throw error
    }

    return data
  }, [])

  // Sign out function dengan proper cleanup
  const signOut = useCallback(async () => {
    console.log('🚪 Signing out user...')
    
    try {
      clearSessionTimeout()
      clearUserSession() // Clear session manager
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('❌ Sign out error:', error.message)
        throw error
      }
      
      // Force clear auth state
      setAuthState({
        user: null,
        profile: null,
        isAuthenticated: false,
        loading: false,
        sessionId: null
      })
      
      console.log('✅ Sign out successful')
    } catch (error) {
      console.error('❌ Sign out exception:', error)
      throw error
    }
  }, [clearSessionTimeout])

  // Refresh profile function
  const refreshProfile = useCallback(async () => {
    if (!authState.user?.id) return null
    
    console.log('🔄 Refreshing user profile...')
    const profile = await loadUserProfile(authState.user.id)
    
    if (profile) {
      setAuthState(prev => ({
        ...prev,
        profile
      }))
    }
    
    return profile
  }, [authState.user?.id, loadUserProfile])

  // Update profile function
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!authState.user?.id) {
      throw new Error('No authenticated user')
    }
    
    console.log('💾 Updating user profile:', authState.user.id)
    
    const { data: updatedProfile, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', authState.user.id)
      .select()
      .single()

    if (error) {
      console.error('❌ Profile update error:', error.message)
      throw error
    }

    // Update local state
    setAuthState(prev => ({
      ...prev,
      profile: updatedProfile
    }))

    return updatedProfile
  }, [authState.user?.id])

  return {
    user: authState.user,
    profile: authState.profile,
    isAuthenticated: authState.isAuthenticated,
    loading: authState.loading,
    sessionId: authState.sessionId,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    updateProfile
  }
} 