'use client'

import { useState, useEffect } from 'react'
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
    images: string[]
  }
  vendor: {
    business_name: string
    location: string
  }
}

export default function ClientBookingsPage() {
  const { isAuthenticated, user, profile, loading: authLoading, preferredRole } = useAuth()
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all')

  useEffect(() => {
    if (isAuthenticated && user) {
      loadBookings()
    }
  }, [isAuthenticated, user])

  const loadBookings = async () => {
    if (!user) return

    try {
      setLoading(true)

      // For now, we'll simulate loading bookings since the table might not be in types yet
      // TODO: Replace with actual query once types are updated
      console.log('Loading bookings for user:', user.id)
      
      // Simulate some sample data
      const sampleBookings: BookingData[] = [
        {
          id: 'sample-1',
          service_id: 'service-1',
          vendor_id: 'vendor-1',
          booking_dates: ['2024-12-25', '2024-12-26'],
          quantity: 1,
          total_price: 5000000,
          status: 'pending',
          client_name: profile?.full_name || '',
          client_phone: profile?.phone || '',
          client_email: user.email || '',
          created_at: new Date().toISOString(),
          service: {
            name: 'Paket Wedding Photography Premium',
            price: 2500000,
            images: []
          },
          vendor: {
            business_name: 'Studio Foto Indah',
            location: 'Jakarta'
          }
        }
      ]

      setBookings(sampleBookings)
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setLoading(false)
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

  const filteredBookings = bookings.filter(booking => 
    filter === 'all' || booking.status === filter
  )

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Check authentication and role after loading is complete
  if (!isAuthenticated || preferredRole !== 'client') {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">This page is only accessible to clients.</p>
{process.env.NODE_ENV === 'development' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
                <p className="text-sm text-yellow-800">
                  <strong>Debug Info:</strong><br/>
                  Auth Loading: {authLoading ? 'Yes' : 'No'}<br/>
                  Authenticated: {isAuthenticated ? 'Yes' : 'No'}<br/>
                  Role: {preferredRole || 'None'}<br/>
                  Profile loaded: {profile ? 'Yes' : 'No'}<br/>
                  User ID: {user?.id || 'None'}<br/>
                  Profile ID: {profile?.id || 'None'}
                </p>
              </div>
            )}
            <Link
              href="/auth/login"
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Login as Client
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Saya</h1>
            <p className="text-gray-600">
              Kelola dan pantau status booking layanan wedding Anda
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'all', label: 'Semua' },
                  { key: 'pending', label: 'Menunggu' },
                  { key: 'confirmed', label: 'Dikonfirmasi' },
                  { key: 'completed', label: 'Selesai' },
                  { key: 'cancelled', label: 'Dibatalkan' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      filter === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                  <div className="flex items-start space-x-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBookings.length > 0 ? (
            <div className="space-y-6">
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        {/* Service Image */}
                        <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                          {booking.service.images && booking.service.images.length > 0 ? (
                            <img
                              src={booking.service.images[0]}
                              alt={booking.service.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="text-gray-400 text-2xl">📸</div>
                          )}
                        </div>

                        {/* Booking Info */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {booking.service.name}
                            </h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                              {getStatusText(booking.status)}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 mb-1">
                            <strong>Vendor:</strong> {booking.vendor.business_name}
                          </p>
                          
                          <p className="text-gray-600 mb-1">
                            <strong>Lokasi:</strong> {booking.vendor.location}
                          </p>

                          <p className="text-gray-600 mb-1">
                            <strong>Tanggal:</strong> {booking.booking_dates.map(date => 
                              new Date(date).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })
                            ).join(', ')}
                          </p>

                          <p className="text-gray-600">
                            <strong>Total:</strong> Rp {booking.total_price.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      {/* Booking Date */}
                      <div className="text-right text-sm text-gray-500">
                        <p>Booking dibuat</p>
                        <p>{new Date(booking.created_at).toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex space-x-3">
                        {booking.status === 'pending' && (
                          <button className="text-red-600 hover:text-red-700 text-sm font-medium">
                            Batalkan Booking
                          </button>
                        )}
                        
                        <Link
                          href={`/services/${booking.service_id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Lihat Service
                        </Link>
                      </div>

                      <div className="flex space-x-3">
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          Chat Vendor
                        </button>
                        
                        {booking.status === 'completed' && (
                          <button className="text-yellow-600 hover:text-yellow-700 text-sm font-medium">
                            Beri Review
                          </button>
                        )}
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Catatan:</strong> {booking.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {filter === 'all' ? 'Belum Ada Booking' : `Tidak Ada Booking ${getStatusText(filter)}`}
              </h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' 
                  ? 'Anda belum melakukan booking layanan wedding.' 
                  : `Tidak ada booking dengan status ${getStatusText(filter).toLowerCase()}.`
                }
              </p>
              {filter === 'all' && (
                <Link
                  href="/services"
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Cari Layanan Wedding
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
} 