'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthState, AuthUser, UserProfile } from '@/types/auth.types'
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
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  // Initialize auth state
  const initializeAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Auth session error:', error)
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.message 
        }))
        return
      }

      if (session?.user) {
        const authUser = convertToAuthUser(session.user)
        const profile = await fetchUserProfile(session.user.id)

        setAuthState({
          isAuthenticated: true,
          user: authUser,
          profile,
          loading: false,
          error: null
        })
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          profile: null,
          loading: false,
          error: null
        })
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to initialize authentication' 
      }))
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
          const profile = await fetchUserProfile(session.user.id)

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
    // Helper computed properties
    isClient: authState.profile?.is_client || false,
    isVendor: authState.profile?.is_vendor || false,
    preferredRole: authState.profile?.preferred_role || 'client',
    isOnboardingCompleted: authState.profile?.onboarding_completed || false,
    isProfileCompleted: authState.profile?.profile_completed || false
  }
} 