'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthState, AuthUser, UserProfile } from '@/types/auth.types'
import { initializeSession, clearSessionCache, clearSnapmeSessions, debugSessionState } from '@/utils/sessionUtils'
import { shouldRetryError } from '@/utils/errorBoundary'
import type { User } from '@supabase/supabase-js'

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    profile: null,
    loading: true,
    error: null
  })

  // Convert Supabase User to AuthUser
  const convertToAuthUser = (user: User | null): AuthUser | null => {
    if (!user) return null
    
    return {
      id: user.id,
      email: user.email || '',
      emailConfirmed: !!user.email_confirmed_at,
      createdAt: user.created_at || ''
    }
  }

  // Fetch user profile
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle() // Gunakan maybeSingle() instead of single()

      if (error) {
        // Handle specific PGRST116 error
        if (error.code === 'PGRST116') {
          console.warn(`User profile not found for userId: ${userId}`)
          return null
        }
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  // Initialize auth state dengan session utilities
  const initializeAuth = async (retryCount = 0) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      // Clear old snapme sessions first
      clearSnapmeSessions()

      // Debug session state di development
      if (process.env.NODE_ENV === 'development') {
        await debugSessionState()
      }

      // Initialize session dengan error recovery
      const session = await initializeSession()
      
      // Jika tidak ada session, set state ke not authenticated (normal condition)
      if (!session) {
        setAuthState({
          isAuthenticated: false,
          user: null,
          profile: null,
          loading: false,
          error: null
        })
        return
      }

      // Jika ada session tapi tidak ada user (edge case)
      if (!session.user) {
        console.warn('Session exists but no user found, clearing session')
        clearSessionCache()
        setAuthState({
          isAuthenticated: false,
          user: null,
          profile: null,
          loading: false,
          error: null
        })
        return
      }

      // Session valid dengan user
      const authUser = convertToAuthUser(session.user)
      
      // Fetch profile dengan enhanced error handling
      let profile = null
      try {
        profile = await fetchUserProfile(session.user.id)
        
        // Jika profile tidak ditemukan, log untuk debugging
        if (!profile) {
          console.warn(`No profile found for user ${session.user.id}, this might be normal for new users`)
        }
      } catch (profileError) {
        console.warn('Failed to fetch profile, continuing without it:', profileError)
        
        // Schedule retry untuk profile fetch setelah auth state stable
        setTimeout(async () => {
          try {
            const retryProfile = await fetchUserProfile(session.user.id)
            if (retryProfile) {
              setAuthState(prev => ({ ...prev, profile: retryProfile }))
            }
          } catch (retryError) {
            console.warn('Profile fetch retry in initializeAuth failed:', retryError)
          }
        }, 1000)
      }

      setAuthState({
        isAuthenticated: true,
        user: authUser,
        profile,
        loading: false,
        error: null
      })

    } catch (error) {
      console.error('Auth initialization error:', error)
      
      // Gunakan error boundary untuk decide retry
      if (retryCount < 2 && shouldRetryError(error, 'initializeAuth')) {
        console.log(`Retrying auth initialization... (${retryCount + 1}/3)`)
        setTimeout(() => initializeAuth(retryCount + 1), 1000 * (retryCount + 1))
        return
      }
      
      // Set ke not authenticated setelah max retry atau auth error
      setAuthState({
        isAuthenticated: false,
        user: null,
        profile: null,
        loading: false,
        error: null // Jangan tampilkan error ke user untuk auth issues
      })
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }))
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.message 
        }))
        return { success: false, error: error.message }
      }

      // Clear session cache
      clearSessionCache()

      setAuthState({
        isAuthenticated: false,
        user: null,
        profile: null,
        loading: false,
        error: null
      })

      return { success: true }
    } catch (error) {
      console.error('Sign out error:', error)
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to sign out' 
      }))
      return { success: false, error: 'Failed to sign out' }
    }
  }

  // Clear session cache manually dengan snapme cleanup
  const clearCache = () => {
    clearSnapmeSessions()
    clearSessionCache()
    // Reinitialize auth after clearing cache
    initializeAuth()
  }

  // Refresh profile
  const refreshProfile = async () => {
    if (!authState.user) return

    const profile = await fetchUserProfile(authState.user.id)
    setAuthState(prev => ({ ...prev, profile }))
  }

  // Listen to auth changes
  useEffect(() => {
    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const authUser = convertToAuthUser(session.user)
          
          // Add retry mechanism for profile fetch
          let profile = null
          try {
            profile = await fetchUserProfile(session.user.id)
          } catch (profileError) {
            console.warn('Failed to fetch profile on auth state change:', profileError)
            // Try one more time after a short delay
            setTimeout(async () => {
              try {
                const retryProfile = await fetchUserProfile(session.user.id)
                if (retryProfile) {
                  setAuthState(prev => ({ ...prev, profile: retryProfile }))
                }
              } catch (retryError) {
                console.warn('Profile fetch retry failed:', retryError)
              }
            }, 500)
          }

          setAuthState({
            isAuthenticated: true,
            user: authUser,
            profile,
            loading: false,
            error: null
          })
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            isAuthenticated: false,
            user: null,
            profile: null,
            loading: false,
            error: null
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    ...authState,
    signOut,
    refreshProfile,
    clearCache,
    // Helper computed properties
    isClient: authState.profile?.is_client || false,
    isVendor: authState.profile?.is_vendor || false,
    preferredRole: authState.profile?.preferred_role || 'client',
    isOnboardingCompleted: authState.profile?.onboarding_completed || false,
    isProfileCompleted: authState.profile?.profile_completed || false
  }
} 