'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoginData, AuthErrors } from '@/types/auth.types'
import { validateLoginForm } from '@/utils/validation'

export const useLogin = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<AuthErrors>({})

  const login = async (data: LoginData) => {
    try {
      setLoading(true)
      setErrors({})

      // Validate form
      const formErrors = validateLoginForm(data)
      if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors)
        setLoading(false)
        return { success: false, errors: formErrors }
      }

      // Attempt login
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (error) {
        const errorMessage = error.message === 'Invalid login credentials' 
          ? 'Email atau password salah'
          : error.message
        
        setErrors({ general: errorMessage })
        setLoading(false)
        return { success: false, error: errorMessage }
      }

      if (authData.user) {
        // Fetch user profile to determine preferred role
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('preferred_role, onboarding_completed')
          .eq('id', authData.user.id)
          .single()

        // Redirect based on onboarding status
        if (!profile?.onboarding_completed) {
          router.push('/onboarding')
        } else {
          // Redirect to home instead of dashboard
          router.push('/')
        }

        setLoading(false)
        return { success: true, user: authData.user }
      }

    } catch (error) {
      console.error('Login error:', error)
      setErrors({ general: 'Terjadi kesalahan saat login' })
      setLoading(false)
      return { success: false, error: 'Terjadi kesalahan saat login' }
    }
  }

  return {
    login,
    loading,
    errors,
    setErrors
  }
} 