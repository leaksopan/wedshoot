'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/hooks/useAuth'

interface VendorData {
  id: string
  business_name: string
  description: string | null
  location: string | null
  verification_status: string | null
  average_rating: number | null
  total_reviews: number | null
}

interface ServiceData {
  id: string
  name: string
  description: string | null
  price: number
  is_active: boolean | null
  is_featured: boolean | null
}

interface BookingData {
  id: string
  service_id: string
  client_id: string
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  booking_dates: string[]
  quantity: number
  total_price: number
  status: string | null
  notes: string | null
  created_at: string | null
  service: {
    name: string
  }
  client: {
    full_name: string | null
    avatar_url: string | null
  }
}

export default function VendorDashboardPage() {
  const { isAuthenticated, user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [vendorData, setVendorData] = useState<VendorData | null>(null)
  const [services, setServices] = useState<ServiceData[]>([])
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingService, setUpdatingService] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'services'>('overview')

  const loadVendorData = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      // Load vendor data
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (vendorError || !vendor) {
        console.error('Error loading vendor data:', vendorError)
        // If vendor data not found, redirect to onboarding
        router.push('/onboarding')
        return
      }

      setVendorData(vendor)

      // Load services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false })

      if (!servicesError) {
        setServices(servicesData || [])
      }

      // Load bookings for vendor
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services!inner(name),
          client:user_profiles!client_id(full_name, avatar_url)
        `)
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false })

      if (!bookingsError) {
        setBookings(bookingsData || [])
      }

    } catch (error) {
      console.error('Error loading vendor dashboard:', error)
    } finally {
      setLoading(false)
    }
  }, [user, router])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (!authLoading && profile && profile.preferred_role !== 'vendor') {
      router.push('/dashboard')
      return
    }

    if (isAuthenticated && user && profile?.preferred_role === 'vendor') {
      loadVendorData()
    }
  }, [isAuthenticated, user, profile, authLoading, router, loadVendorData])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      router.push('/login')
    }
  }

  const handleToggleFeatured = async (serviceId: string, currentStatus: boolean | null) => {
    setUpdatingService(serviceId)
    
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_featured: !currentStatus })
        .eq('id', serviceId)

      if (error) {
        console.error('Error updating featured status:', error)
        alert('Gagal mengubah status featured')
        return
      }

      // Update local state
      setServices(prev => 
        prev.map(service => 
          service.id === serviceId 
            ? { ...service, is_featured: !currentStatus }
            : service
        )
      )

      alert(`Service ${!currentStatus ? 'ditambahkan ke' : 'dihapus dari'} featured packages`)

    } catch (error) {
      console.error('Error:', error)
      alert('Terjadi kesalahan')
    } finally {
      setUpdatingService(null)
    }
  }

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      // Get booking details first
      const booking = bookings.find(b => b.id === bookingId)
      if (!booking || !vendorData) {
        alert('Booking tidak ditemukan')
        return
      }

      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)

      if (error) {
        console.error('Error updating booking status:', error)
        alert('Gagal mengubah status booking')
        return
      }

      // Update local state
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus }
            : booking
        )
      )

      alert(`Booking berhasil diubah ke status: ${newStatus}`)

    } catch (error) {
      console.error('Error updating booking status:', error)
      alert('Terjadi kesalahan')
    }
  }

  // Calculate stats
  const totalRevenue = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + Number(b.total_price), 0)

  const pendingBookings = bookings.filter(b => b.status === 'pending').length
  const activeServices = services.filter(s => s.is_active !== false).length

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string | null) => {
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat dashboard vendor...</p>
        </div>
      </div>
    )
  }

  if (!vendorData) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-6xl mb-6">🏪</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Vendor Profile Not Found</h2>
            <p className="text-gray-600 mb-6">Silakan lengkapi registrasi vendor Anda terlebih dahulu.</p>
            <Link
              href="/onboarding"
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Lengkapi Registrasi
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Dashboard Vendor
                </h1>
                <p className="text-gray-600 mt-1">
                  Selamat datang kembali, {vendorData.business_name}! 👋
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
                <Link
                  href="/vendor/services/create"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  + Tambah Service
                </Link>
                <Link
                  href="/vendor/services"
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors font-medium"
                >
                  Kelola Services
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-red-600 hover:text-red-800 px-4 py-2 font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            
            {/* Vendor Status Alert */}
            <div className="mb-6">
              {vendorData.verification_status !== 'verified' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Akun Vendor Belum Terverifikasi
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          Akun vendor Anda sedang dalam proses verifikasi. 
                          Setelah terverifikasi, profile Anda akan lebih mudah ditemukan client.
                        </p>
                      </div>
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
                    <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      Rp {totalRevenue.toLocaleString('id-ID')}
                    </p>
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
                    <p className="text-sm font-medium text-gray-500">Pending Bookings</p>
                    <p className="text-2xl font-semibold text-gray-900">{pendingBookings}</p>
                  </div>
                </div>
              </div>

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
                    <p className="text-sm font-medium text-gray-500">Active Services</p>
                    <p className="text-2xl font-semibold text-gray-900">{activeServices}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Rating</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {vendorData.average_rating ? vendorData.average_rating.toFixed(1) : '0.0'} ⭐
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mb-8">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'overview'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'bookings'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Bookings ({bookings.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'services'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Services ({services.length})
                  </button>
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Bookings */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
                  </div>
                  <div className="p-6">
                    {bookings.slice(0, 3).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="font-medium text-gray-900">
                            {booking.client?.full_name || booking.client_name || 'Unknown Client'}
                          </p>
                          <p className="text-sm text-gray-600">{booking.service.name}</p>
                          <p className="text-xs text-gray-500">
                            {booking.booking_dates.map(date => formatDate(date)).join(', ')}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status || 'pending'}
                        </span>
                      </div>
                    ))}
                    {bookings.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No bookings yet</p>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Quick Stats</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Bookings</span>
                      <span className="font-semibold">{bookings.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pending</span>
                      <span className="font-semibold text-yellow-600">
                        {bookings.filter(b => b.status === 'pending').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Confirmed</span>
                      <span className="font-semibold text-green-600">
                        {bookings.filter(b => b.status === 'confirmed').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed</span>
                      <span className="font-semibold text-blue-600">
                        {bookings.filter(b => b.status === 'completed').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Potential Revenue</span>
                      <span className="font-semibold text-yellow-600">
                        Rp {bookings
                          .filter(b => b.status === 'confirmed')
                          .reduce((sum, b) => sum + Number(b.total_price), 0)
                          .toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual Revenue</span>
                      <span className="font-semibold text-green-600">
                        Rp {bookings
                          .filter(b => b.status === 'completed')
                          .reduce((sum, b) => sum + Number(b.total_price), 0)
                          .toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bookings' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">All Bookings</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dates
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-700">
                                    {(booking.client?.full_name || booking.client_name || 'U').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {booking.client?.full_name || booking.client_name || 'Unknown Client'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {booking.client_email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{booking.service.name}</div>
                            <div className="text-sm text-gray-500">Qty: {booking.quantity}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {booking.booking_dates.map(date => (
                                <div key={date}>{formatDate(date)}</div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              Rp {Number(booking.total_price).toLocaleString('id-ID')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                              {booking.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {booking.status === 'pending' && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                            {booking.status === 'confirmed' && (
                              <button
                                onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Mark Complete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bookings.length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">📅</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Bookings Yet
                      </h3>
                      <p className="text-gray-600">
                        Your bookings will appear here once clients start booking your services.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'services' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Your Services ({services.length})
                  </h2>
                  <Link
                    href="/vendor/services/create"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Add New Service
                  </Link>
                </div>
              </div>

              <div className="p-6">
                {services.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service) => (
                      <div key={service.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 line-clamp-2">
                            {service.name}
                          </h3>
                          <div className="flex gap-2">
                            {service.is_featured && (
                              <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                Featured
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              service.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {service.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {service.description}
                        </p>
                        
                        {/* Featured Toggle */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-bold text-blue-600">
                            Rp {Number(service.price).toLocaleString('id-ID')}
                          </span>
                          <button
                            onClick={() => handleToggleFeatured(service.id, service.is_featured)}
                            disabled={updatingService === service.id}
                            className={`px-3 py-1 text-xs rounded-full transition-colors ${
                              service.is_featured
                                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            } ${updatingService === service.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {updatingService === service.id ? '...' : service.is_featured ? '⭐ Featured' : 'Mark Featured'}
                          </button>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Link
                            href={`/vendor/services/${service.id}/edit`}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Edit
                          </Link>
                          <button className="text-red-600 hover:text-red-700 text-sm">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📦</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Services Yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Start by creating your first service package to attract clients.
                    </p>
                    <Link
                      href="/vendor/services/create"
                      className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Create Your First Service
                    </Link>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/vendor/inquiries"
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <div className="text-2xl mb-2">💬</div>
                <h3 className="font-semibold text-gray-900 mb-1">Inquiries</h3>
                <p className="text-gray-600 text-sm">Manage client inquiries</p>
              </Link>

              <Link
                href="/vendor/bookings"
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <div className="text-2xl mb-2">📅</div>
                <h3 className="font-semibold text-gray-900 mb-1">Bookings</h3>
                <p className="text-gray-600 text-sm">View your bookings</p>
              </Link>

              <Link
                href="/vendor/portfolio"
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <div className="text-2xl mb-2">🖼️</div>
                <h3 className="font-semibold text-gray-900 mb-1">Portfolio</h3>
                <p className="text-gray-600 text-sm">Manage your portfolio</p>
              </Link>

              <Link
                href="/vendor/analytics"
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
              >
                <div className="text-2xl mb-2">📊</div>
                <h3 className="font-semibold text-gray-900 mb-1">Analytics</h3>
                <p className="text-gray-600 text-sm">View performance data</p>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  )
} 