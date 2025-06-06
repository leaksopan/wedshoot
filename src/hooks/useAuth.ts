'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthState, AuthUser, UserProfile } from '@/types/auth.types'
import { initializeSession, clearSessionCache, clearSnapmeSessions, debugSessionState } from '@/utils/sessionUtils'
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

  // Initialize auth state dengan session utilities - OPTIMIZED
  const initializeAuth = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      // Clear old snapme sessions first
      clearSnapmeSessions()

      // Skip debug in production untuk performa
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

      // Set authenticated state first untuk faster UI response
      setAuthState({
        isAuthenticated: true,
        user: authUser,
        profile: null, // Profile akan di-load async
        loading: false,
        error: null
      })

      // Load profile asynchronously untuk tidak block UI
      fetchUserProfile(session.user.id)
        .then(profile => {
          if (profile) {
            setAuthState(prev => ({ ...prev, profile }))
          }
        })
        .catch(profileError => {
          console.warn('Failed to fetch profile:', profileError)
          // Retry sekali lagi setelah delay
          setTimeout(async () => {
            try {
              const retryProfile = await fetchUserProfile(session.user.id)
              if (retryProfile) {
                setAuthState(prev => ({ ...prev, profile: retryProfile }))
              }
            } catch (retryError) {
              console.warn('Profile fetch retry failed:', retryError)
            }
          }, 2000)
        })

    } catch (error) {
      console.error('Auth initialization error:', error)

      // Set ke not authenticated setelah error
      setAuthState({
        isAuthenticated: false,
        user: null,
        profile: null,
        loading: false,
        error: null // Jangan tampilkan error ke user untuk auth issues
      })
    }
  }, [])

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
  const clearCache = useCallback(() => {
    clearSnapmeSessions()
    clearSessionCache()
    // Reinitialize auth after clearing cache
    initializeAuth()
  }, [initializeAuth])

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (!authState.user) return

    const profile = await fetchUserProfile(authState.user.id)
    setAuthState(prev => ({ ...prev, profile }))
  }, [authState.user])

  // Listen to auth changes - hanya dijalankan sekali saat mount
  useEffect(() => {
    let isMounted = true
    
    const initialize = async () => {
      if (isMounted) {
        await initializeAuth()
      }
    }
    
    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        
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
              if (!isMounted) return
              try {
                const retryProfile = await fetchUserProfile(session.user.id)
                if (retryProfile && isMounted) {
                  setAuthState(prev => ({ ...prev, profile: retryProfile }))
                }
              } catch (retryError) {
                console.warn('Profile fetch retry failed:', retryError)
              }
            }, 500)
          }

          if (isMounted) {
            setAuthState({
              isAuthenticated: true,
              user: authUser,
              profile,
              loading: false,
              error: null
            })
          }
        } else if (event === 'SIGNED_OUT' && isMounted) {
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
      isMounted = false
      subscription.unsubscribe()
    }
  }, []) // Empty dependency array untuk hanya run sekali

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