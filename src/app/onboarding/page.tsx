'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OnboardingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session?.user) {
          console.log('No session, redirecting to login')
          router.push('/login')
          return
        }

        setUser(session.user)

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (!profileError && profileData) {
          setProfile(profileData)
          
          // Jika onboarding sudah selesai, redirect ke home
          if (profileData.onboarding_completed) {
            router.push('/')
            return
          }
        } else {
          // Jika tidak ada profile, buat profile baru
          console.log('No profile found, akan redirect ke registration untuk melengkapi profile')
        }

        setLoading(false)
      } catch (error) {
        console.error('Error checking user:', error)
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  const handleCompleteOnboarding = async () => {
    try {
      // Update onboarding_completed
      const { error } = await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)

      if (!error) {
        // Redirect ke home page setelah onboarding selesai
        router.push('/')
      }
    } catch (error) {
      console.error('Error completing onboarding:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Selamat Datang di WedShoot! 🎉
          </h1>
          <p className="text-gray-600">
            Mari selesaikan pengaturan akun Anda
          </p>
        </div>

        {user && (
          <div className="space-y-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Info Akun:</h3>
              <p><span className="font-medium">Email:</span> {user.email}</p>
              {profile && (
                <>
                  <p><span className="font-medium">Nama:</span> {profile.full_name}</p>
                  <p><span className="font-medium">Role:</span> {profile.preferred_role}</p>
                  <p><span className="font-medium">Phone:</span> {profile.phone}</p>
                </>
              )}
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Status:</h3>
              <p>✅ Akun berhasil dibuat</p>
              <p>✅ Profile telah tersedia</p>
              <p>🔄 Menunggu penyelesaian onboarding</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleCompleteOnboarding}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Selesaikan Onboarding & Lanjut ke Beranda
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors font-medium"
          >
            Langsung ke Beranda
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    </div>
  )
} 