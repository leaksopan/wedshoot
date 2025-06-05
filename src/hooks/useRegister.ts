'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RegisterData, AuthErrors } from '@/types/auth.types'
import { validateRegisterForm, formatPhoneNumber } from '@/utils/validation'

export const useRegister = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<AuthErrors>({})

  const register = async (data: RegisterData) => {
    try {
      setLoading(true)
      setErrors({})

      // Validate form
      const formErrors = validateRegisterForm(data)
      if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors)
        setLoading(false)
        return { success: false, errors: formErrors }
      }

      // Format phone number
      const formattedPhone = formatPhoneNumber(data.phone)

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: data.fullName,
            phone: formattedPhone,
            user_type: data.userType
          }
        }
      })

      console.log('Auth signup result:', { authData, authError })

      if (authError) {
        console.error('Auth signup error:', authError)
        let errorMessage = 'Terjadi kesalahan saat registrasi'
        
        if (authError.message.includes('User already registered')) {
          errorMessage = 'Email sudah terdaftar'
        } else if (authError.message.includes('Password should be at least')) {
          errorMessage = 'Password minimal 6 karakter'
        } else if (authError.message.includes('Unable to validate email address')) {
          errorMessage = 'Format email tidak valid'
        } else if (authError.message.includes('signup is disabled')) {
          errorMessage = 'Registrasi sedang dinonaktifkan'
        } else {
          errorMessage = `Error: ${authError.message}`
        }
        
        setErrors({ general: errorMessage })
        setLoading(false)
        return { success: false, error: errorMessage }
      }

      // Check if user was created (even if not confirmed yet)
      if (authData.user) {
        console.log('User created successfully:', authData.user.id, 'Email confirmed:', authData.user.email_confirmed_at)
        
        // Cek apakah email sudah dikonfirmasi atau belum
        const isEmailConfirmed = !!authData.user.email_confirmed_at
        
        // Jika email belum dikonfirmasi, tampilkan pesan untuk cek email
        if (!isEmailConfirmed) {
          console.log('Email not confirmed yet, asking user to check email')
          setLoading(false)
          setErrors({ 
            general: '📧 Registrasi berhasil! Silakan cek email Anda untuk mengkonfirmasi akun sebelum login.' 
          })
          return { 
            success: true, 
            user: authData.user,
            message: 'Registrasi berhasil! Cek email untuk konfirmasi.',
            needsEmailConfirmation: true
          }
        }

        // Jika email sudah dikonfirmasi (auto-confirm), lanjutkan dengan pembuatan profile
        console.log('Email already confirmed, proceeding with profile creation')
        
        // Profile akan otomatis dibuat oleh database trigger handle_new_user()
        // Tunggu sebentar untuk memastikan trigger selesai
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Verifikasi bahwa profile berhasil dibuat dengan retry
        let profileCheck = null
        let profileRetries = 0
        const maxProfileRetries = 5

        while (profileRetries < maxProfileRetries) {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('id, full_name, preferred_role')
            .eq('id', authData.user.id)

          if (!error && data && data.length > 0) {
            profileCheck = data[0]
            break
          }

          console.log(`Profile not found, retry ${profileRetries + 1}/${maxProfileRetries}`)
          profileRetries++
          
          if (profileRetries < maxProfileRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }

        if (!profileCheck) {
          console.error('Profile not created by trigger after retries')
          setErrors({ 
            general: '⚠️ Registrasi berhasil tetapi terjadi masalah teknis. Silakan coba login dengan akun yang baru dibuat.' 
          })
          setLoading(false)
          return { success: false, error: 'Profile creation timeout' }
        }

        console.log('Profile verified/created:', profileCheck)

        // If vendor, create vendor record
        if (data.userType === 'vendor') {
          try {
            // Get default category (Fotografer)
            const { data: defaultCategory } = await supabase
              .from('vendor_categories')
              .select('id')
              .eq('slug', 'fotografer')
              .single()

            const { error: vendorError } = await supabase
              .from('vendors')
              .insert({
                user_id: authData.user.id,
                business_name: data.fullName + ' Photography',
                category_id: defaultCategory?.id || '031b671e-bb7d-453c-805b-60df5c37873e',
                verification_status: 'pending',
                is_active: true
              })

            if (vendorError) {
              console.error('Vendor creation error:', vendorError)
              // Don't fail registration if vendor record creation fails
            }
          } catch (vendorCreationError) {
            console.error('Vendor creation failed:', vendorCreationError)
            // Continue with registration even if vendor creation fails
          }
        }

        setLoading(false)
        
        console.log('User created and profile verified. Proceeding to onboarding...')
        
        // Redirect to onboarding setelah registrasi berhasil
        setTimeout(() => {
          router.push('/onboarding')
        }, 1000)
        
        setErrors({ 
          general: '✅ Registrasi berhasil! Mengarahkan ke halaman onboarding...' 
        })
        
        return { 
          success: true, 
          user: authData.user,
          message: 'Registrasi berhasil!'
        }
      }

    } catch (error) {
      console.error('Registration error:', error)
      setErrors({ general: 'Terjadi kesalahan saat registrasi' })
      setLoading(false)
      return { success: false, error: 'Terjadi kesalahan saat registrasi' }
    }
  }

  return {
    register,
    loading,
    errors,
    setErrors
  }
} 