'use client'

import { useEffect, useState } from 'react'
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

export default function VendorDashboardPage() {
  const { isAuthenticated, user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [vendorData, setVendorData] = useState<VendorData | null>(null)
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (!authLoading && profile?.preferred_role !== 'vendor') {
      router.push('/dashboard')
      return
    }

    if (isAuthenticated && user) {
      loadVendorData()
    }
  }, [isAuthenticated, user, profile, authLoading, router])

  const loadVendorData = async () => {
    if (!user?.id) return

    try {
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

    } catch (error) {
      console.error('Error loading vendor dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading vendor dashboard...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!vendorData) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Vendor Profile Not Found</h2>
            <p className="text-gray-600 mb-6">Please complete your vendor registration first.</p>
            <Link
              href="/onboarding"
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Complete Registration
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="bg-gray-50 min-h-screen">
        {/* Page Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Vendor Dashboard
                </h1>
                <p className="text-gray-600 mt-1">
                  Welcome back, {vendorData.business_name}!
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex space-x-3">
                <Link
                  href="/vendor/services/create"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Service
                </Link>
                <Link
                  href="/vendor/profile"
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Edit Profile
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold">✓</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Verification Status</p>
                  <p className={`text-lg font-semibold ${
                    vendorData.verification_status === 'verified' 
                      ? 'text-green-600' 
                      : vendorData.verification_status === 'pending'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {vendorData.verification_status === 'verified' ? 'Verified' : 
                     vendorData.verification_status === 'pending' ? 'Pending' : 
                     vendorData.verification_status === 'rejected' ? 'Rejected' : 'Not Set'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">⭐</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Average Rating</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {vendorData.average_rating ?? 0}/5 ({vendorData.total_reviews ?? 0} reviews)
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold">📦</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Services</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {services.filter(s => s.is_active).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Services Section */}
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
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          service.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {service.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {service.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-600">
                          Rp {Number(service.price).toLocaleString('id-ID')}
                        </span>
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
      </div>
    </AppLayout>
  )
} 