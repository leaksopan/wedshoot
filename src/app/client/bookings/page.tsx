'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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

  const loadBookings = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)

      // For now, we'll simulate loading bookings since the table might not be in types yet
      // TODO: Replace with actual query once types are updated
      
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
    } catch {
      // Error handled silently
    } finally {
      setLoading(false)
    }
  }, [user, profile])

  useEffect(() => {
    if (isAuthenticated && user) {
      loadBookings()
    }
  }, [isAuthenticated, user, loadBookings])

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
                    onClick={() => setFilter(tab.key as 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled')}
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

          {/* Content */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Memuat booking...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white rounded-lg shadow-sm p-8">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {filter === 'all' ? 'Belum ada booking' : `Belum ada booking dengan status ${getStatusText(filter)}`}
                </h3>
                <p className="text-gray-500 mb-6">
                  Mulai cari vendor dan buat booking untuk acara pernikahan Anda
                </p>
                <Link
                  href="/services"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Cari Layanan
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {booking.service.name}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                            {getStatusText(booking.status)}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-1">
                          <strong>Vendor:</strong> {booking.vendor.business_name}
                        </p>
                        <p className="text-gray-600 text-sm mb-1">
                          <strong>Lokasi:</strong> {booking.vendor.location}
                        </p>
                        <p className="text-gray-600 text-sm">
                          <strong>Tanggal:</strong> {booking.booking_dates.join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          Rp {booking.total_price.toLocaleString('id-ID')}
                        </p>
                        <p className="text-sm text-gray-500">
                          Qty: {booking.quantity}
                        </p>
                      </div>
                    </div>

                    {/* Service Images */}
                    {booking.service.images && booking.service.images.length > 0 && (
                      <div className="mb-4">
                        <div className="flex space-x-2 overflow-x-auto">
                          {booking.service.images.slice(0, 3).map((image, index) => (
                            <Image
                              key={index}
                              src={image}
                              alt={`${booking.service.name} ${index + 1}`}
                              width={100}
                              height={80}
                              className="w-24 h-20 object-cover rounded-lg flex-shrink-0"
                            />
                          ))}
                          {booking.service.images.length > 3 && (
                            <div className="w-24 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-sm text-gray-500">
                                +{booking.service.images.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {booking.notes && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600">
                          <strong>Catatan:</strong> {booking.notes}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-500">
                        Dibuat: {new Date(booking.created_at).toLocaleDateString('id-ID')}
                      </p>
                      <div className="flex space-x-3">
                        <Link
                          href={`/client/bookings/${booking.id}`}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Detail
                        </Link>
                        {booking.status === 'pending' && (
                          <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors">
                            Batalkan
                          </button>
                        )}
                        {booking.status === 'confirmed' && (
                          <Link
                            href={`/chat/${booking.vendor_id}`}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                          >
                            Chat Vendor
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
} 