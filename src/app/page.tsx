'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/AppLayout'

// Types
interface VendorCategory {
  id: string
  name: string
  description: string | null
  slug: string | null
  icon: string | null
}

interface Service {
  id: string
  name: string
  description: string | null
  price: number
  vendor: {
    business_name: string
    location: string | null
    average_rating: number
    total_reviews: number
  }
  category: string
  images: string[]
  service_type: string | null
  duration: number | null
}

interface Vendor {
  id: string
  business_name: string
  description: string | null
  location: string | null
  average_rating: number
  total_reviews: number
  category_name: string
  owner_name: string
  is_active: boolean
}

export default function Home() {
  const { isAuthenticated, user, profile, loading: authLoading } = useAuth()
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [featuredServices, setFeaturedServices] = useState<Service[]>([])
  const [topVendors, setTopVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHomeData()
  }, [])

  const loadHomeData = async () => {
    try {
      // Load categories
      const { data: categoriesData } = await supabase
        .from('vendor_categories')
        .select('id, name, description, slug, icon')
        .eq('is_active', true)
        .order('sort_order')
        .limit(8)

      setCategories(categoriesData || [])

      // Load vendors (simplified query)
      const { data: vendorsData } = await supabase
        .from('vendors')
        .select(`
          id,
          user_id,
          business_name,
          description,
          location,
          average_rating,
          total_reviews,
          is_active,
          category_id
        `)
        .eq('is_active', true)
        .order('average_rating', { ascending: false })
        .limit(8)

      if (vendorsData) {
        // Get category names for vendors
        const categoryIds = vendorsData.map(v => v.category_id)
        const { data: categoriesForVendors } = await supabase
          .from('vendor_categories')
          .select('id, name')
          .in('id', categoryIds)

        const categoryMap = new Map(categoriesForVendors?.map(c => [c.id, c.name]) || [])

        // Get user profiles for vendor owners
        const userIds = vendorsData.map(v => v.user_id)
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', userIds)

        const userMap = new Map(userProfiles?.map(u => [u.id, u.full_name]) || [])

        const transformedVendors: Vendor[] = vendorsData.map(vendor => ({
          id: vendor.id,
          business_name: vendor.business_name,
          description: vendor.description,
          location: vendor.location,
          average_rating: parseFloat(vendor.average_rating?.toString() || '0'),
          total_reviews: vendor.total_reviews || 0,
          category_name: categoryMap.get(vendor.category_id) || 'General',
          owner_name: userMap.get(vendor.user_id) || 'Unknown',
          is_active: Boolean(vendor.is_active)
        }))

        setTopVendors(transformedVendors)
      }

      // Load featured services  
      const { data: basicServicesData } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(6)

      if (basicServicesData) {
        // Get vendor data for services
        const vendorIds = basicServicesData.map(s => s.vendor_id)
        const { data: vendorsForServices } = await supabase
          .from('vendors')
          .select(`
            id,
            business_name,
            location,
            average_rating,
            total_reviews,
            category_id
          `)
          .in('id', vendorIds)

        // Get category data for vendors
        const categoryIds = vendorsForServices?.map(v => v.category_id) || []
        const { data: categoriesForServices } = await supabase
          .from('vendor_categories')
          .select('id, name')
          .in('id', categoryIds)

        const vendorMap = new Map(vendorsForServices?.map(v => [v.id, v]) || [])
        const categoryMap = new Map(categoriesForServices?.map(c => [c.id, c.name]) || [])

        const transformedServices: Service[] = basicServicesData.map(service => {
          const vendor = vendorMap.get(service.vendor_id)
          const categoryName = vendor ? categoryMap.get(vendor.category_id) : 'General'
          const serviceData = service as any // Type casting untuk akses images
          

          
          return {
            id: service.id,
            name: service.name,
            description: service.description,
            price: parseFloat(service.price?.toString() || '0'),
            images: serviceData.images || [], // Mengambil images dari database
            service_type: service.service_type,
            duration: service.duration,
            vendor: {
              business_name: vendor?.business_name || 'Unknown Vendor',
              location: vendor?.location || null,
              average_rating: parseFloat(vendor?.average_rating?.toString() || '0'),
              total_reviews: vendor?.total_reviews || 0
            },
            category: categoryName || 'General'
          }
        })

        // Debug: Log service "1 Day Full" specifically
        const dayFullService = transformedServices.find(s => s.name === '1 Day Full')
        if (dayFullService) {
          console.log('🔍 1 Day Full service found:', {
            name: dayFullService.name,
            imageCount: dayFullService.images.length,
            images: dayFullService.images
          })
        }
        
        setFeaturedServices(transformedServices)
      }

    } catch (error) {
      console.error('Error loading home data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="bg-gray-50">

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Find Your Perfect
            <span className="text-blue-600 block">Wedding Photography</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Discover talented photographers and wedding vendors for your special day. 
            Browse packages, compare prices, and book with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/vendors"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              Browse Vendors
            </Link>
            <Link
              href="/services"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors shadow-lg"
            >
              View Packages
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Explore Categories
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Find exactly what you need for your wedding from our wide range of trusted vendors
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug || 'general'}`}
                className="group p-6 bg-gray-50 rounded-xl hover:bg-blue-50 hover:shadow-md transition-all duration-300"
              >
                <div className="text-center">
                  <div className="text-3xl mb-3">
                    {category.icon || '📸'}
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {category.description || 'Wedding services'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Services Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Featured Packages
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Handpicked premium packages from our top-rated vendors
            </p>
          </div>

          {featuredServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredServices.map((service) => (
                <Link 
                  key={service.id} 
                  href={`/services/${service.id}`}
                  className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  {/* Image Section */}
                  <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100">
                    {service.images && service.images.length > 0 ? (
                      <img
                        src={service.images[0]}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="text-4xl mb-2">📸</div>
                          <span className="text-sm text-gray-600">{service.category}</span>
                        </div>
                      </div>
                    )}
                    {/* Service Type Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/90 backdrop-blur-sm text-blue-600 px-2 py-1 rounded-full text-xs font-medium">
                        {service.service_type === 'package' ? 'Paket' : 'Individual'}
                      </span>
                    </div>
                    {/* Duration Badge */}
                    {service.duration && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-black/70 text-white px-2 py-1 rounded-full text-xs">
                          {service.duration} jam
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {service.name}
                      </h3>
                      <div className="flex items-center ml-2">
                        <span className="text-yellow-400 mr-1">⭐</span>
                        <span className="text-sm text-gray-600">
                          {service.vendor.average_rating}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {service.description}
                    </p>

                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xl font-bold text-blue-600">
                        Rp {service.price.toLocaleString('id-ID')}
                      </div>
                      <span className="text-xs text-gray-500">
                        {service.vendor.total_reviews} reviews
                      </span>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {service.vendor.business_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            📍 {service.vendor.location || 'Location TBD'}
                          </p>
                        </div>
                        <div className="text-xs text-blue-600 font-medium group-hover:text-blue-700">
                          Lihat Detail →
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📸</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Services Coming Soon
              </h3>
              <p className="text-gray-600 mb-6">
                Our vendors are currently setting up their amazing packages. Check back soon!
              </p>
              {isAuthenticated && profile?.preferred_role === 'vendor' && (
                <Link
                  href="/vendor/services/create"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Package
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Top Vendors Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Top Rated Vendors
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Meet our highest-rated wedding vendors with proven track records
            </p>
          </div>

          {topVendors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {topVendors.map((vendor) => (
                <div key={vendor.id} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow duration-300">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">👤</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {vendor.business_name}
                    </h3>
                    <p className="text-sm text-blue-600 mb-2">
                      {vendor.category_name}
                    </p>
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-yellow-400 mr-1">⭐</span>
                      <span className="text-sm text-gray-600">
                        {vendor.average_rating} ({vendor.total_reviews} reviews)
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      📍 {vendor.location || 'Location TBD'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Vendors Joining Soon
              </h3>
              <p className="text-gray-600 mb-6">
                Amazing wedding vendors are signing up to showcase their work. Stay tuned!
              </p>
              {!isAuthenticated && (
                <Link
                  href="/register"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Join as Vendor
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Plan Your Perfect Wedding?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of couples who found their dream wedding vendors on WedShoot
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-colors shadow-lg"
            >
              Get Started Today
            </Link>
            <Link
              href="/vendors"
              className="bg-transparent text-white px-8 py-4 rounded-lg font-semibold text-lg border-2 border-white hover:bg-white hover:text-blue-600 transition-colors"
            >
              Browse Vendors
            </Link>
          </div>
        </div>
      </section>

      </div>
    </AppLayout>
  )
}
