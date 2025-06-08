'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/hooks/useAuth'

interface BookingData {
  id: string
  service_id: string
  vendor_id: string
  booking_dates: string[]
  quantity: number
  total_price: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes?: string
  client_name: string
  client_phone: string
  client_email: string
  created_at: string
  service: {
    name: string
    price: number
  }
  vendor: {
    business_name: string
    location: string
  }
}

export default function DashboardPage() {
  const { isAuthenticated, user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)

  const loadBookings = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      // Load bookings for client
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services!inner(name, price),
          vendor:vendors!inner(business_name, location)
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })

      if (!bookingsError && bookingsData) {
        setBookings(bookingsData || [])
      }

    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Redirect vendor to vendor dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated && profile) {
      if (profile.preferred_role === 'vendor') {
        router.replace('/vendor/dashboard')
        return
      }
      // Only load bookings if user is client
      if (profile.preferred_role === 'client' || profile.is_client) {
        loadBookings()
      }
    }
  }, [isAuthenticated, profile, authLoading, router, loadBookings])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
  }, [isAuthenticated, authLoading, router])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      router.push('/login')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Menunggu Konfirmasi'
      case 'confirmed':
        return 'Dikonfirmasi'
      case 'completed':
        return 'Selesai'
      case 'cancelled':
        return 'Dibatalkan'
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Show loading while checking role
  if (authLoading || loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show access denied for vendors (they should be redirected but just in case)
  if (profile.preferred_role === 'vendor') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <p className="text-gray-600">Redirecting to vendor dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="bg-gray-50">

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6 mb-6 relative">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Selamat Datang! 🎉
            </h2>
            <p className="text-gray-600 mb-6">
              Registrasi berhasil dan Anda sekarang berada di dashboard WedShoot.
            </p>
            <button
              onClick={handleSignOut}
              className="absolute top-4 right-4 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors text-sm"
            >
              Sign Out
            </button>

            {profile && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">Profile Information:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Full Name:</span> {profile.full_name}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {user?.email}
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Booking</p>
                  <p className="text-2xl font-semibold text-gray-900">{bookings.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {bookings.filter(b => b.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Confirmed</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {bookings.filter(b => b.status === 'confirmed').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Spent</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    Rp {bookings
                      .filter(b => b.status === 'confirmed' || b.status === 'completed')
                      .reduce((sum, b) => sum + Number(b.total_price), 0)
                      .toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
              <Link
                href="/client/bookings"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All
              </Link>
            </div>
            <div className="p-6">
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Belum ada booking</h4>
                  <p className="text-gray-600 mb-6">
                    Mulai mencari vendor untuk wedding impian Anda! Jelajahi berbagai vendor photography, 
                    videography, catering, dan lainnya.
                  </p>
                  <div className="space-y-3">
                    <Link
                      href="/vendors"
                      className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium inline-block"
                    >
                      Jelajahi Vendor
                    </Link>
                    <div className="text-sm text-gray-500">
                      atau <Link href="/services" className="text-blue-600 hover:text-blue-800">lihat semua layanan</Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {booking.service.name}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {booking.vendor.business_name} • {booking.vendor.location}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>
                              Tanggal: {booking.booking_dates.map(date => formatDate(date)).join(', ')}
                            </span>
                            <span>•</span>
                            <span>
                              Total: Rp {Number(booking.total_price).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                            {getStatusText(booking.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tips & Getting Started */}
          {bookings.length === 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                💡 Tips Memulai Wedding Planning
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-sm font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Tentukan Budget</h4>
                      <p className="text-sm text-gray-600">Tetapkan budget untuk setiap kategori vendor</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-sm font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Pilih Vendor Utama</h4>
                      <p className="text-sm text-gray-600">Mulai dengan photographer dan venue</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-sm font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Compare & Chat</h4>
                      <p className="text-sm text-gray-600">Bandingkan vendor dan chat langsung</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-sm font-bold">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Book & Manage</h4>
                      <p className="text-sm text-gray-600">Booking dan kelola semua di dashboard</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Vendors</h3>
              <p className="text-gray-600 text-sm mb-4">
                Browse and hire wedding vendors for your special day
              </p>
              <Link
                href="/vendors"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm inline-block text-center"
              >
                Browse Vendors
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Messages</h3>
              <p className="text-gray-600 text-sm mb-4">
                Communicate with your vendors
              </p>
              <Link
                href="/chat"
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-sm inline-block text-center"
              >
                View Messages
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile</h3>
              <p className="text-gray-600 text-sm mb-4">
                Update your profile and preferences
              </p>
              <Link
                href="/profile"
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-sm inline-block text-center"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </div>
      </main>
      </div>
    </AppLayout>
  )
} 