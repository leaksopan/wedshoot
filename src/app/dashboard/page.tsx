'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/AppLayout'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session?.user) {
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
        }

        setLoading(false)
      } catch (error) {
        console.error('Error checking user:', error)
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="bg-gray-50">

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Selamat Datang! 🎉
            </h2>
            <p className="text-gray-600 mb-6">
              Registrasi berhasil dan Anda sekarang berada di dashboard WedShoot.
            </p>

            {profile && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">Profile Information:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Full Name:</span> {profile.full_name}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {user.email}
                  </div>
                  <div>
                    <span className="font-medium">Role:</span> {profile.preferred_role}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {profile.phone}
                  </div>
                  <div>
                    <span className="font-medium">Client Status:</span> {profile.is_client ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <span className="font-medium">Onboarding:</span> {profile.onboarding_completed ? 'Completed' : 'Pending'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {profile?.preferred_role === 'client' ? 'Find Vendors' : 'Manage Services'}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {profile?.preferred_role === 'client' 
                  ? 'Browse and hire wedding vendors' 
                  : 'Manage your services and bookings'
                }
              </p>
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm">
                Get Started
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Messages</h3>
              <p className="text-gray-600 text-sm mb-4">
                Communicate with clients and vendors
              </p>
              <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-sm">
                View Messages
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile</h3>
              <p className="text-gray-600 text-sm mb-4">
                Update your profile and preferences
              </p>
              <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-sm">
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </main>
      </div>
    </AppLayout>
  )
} 