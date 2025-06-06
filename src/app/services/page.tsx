'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/hooks/useAuth'

interface Service {
  id: string
  name: string
  description: string | null
  price: number
  vendor: {
    id: string
    business_name: string
    location: string | null
    average_rating: number
    total_reviews: number
  }
  category: string
  images: string[]
  service_type: string | null
  duration: number | null
  is_featured: boolean
}

interface ServiceFromDB {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: string[];
  service_type: string | null;
  duration: number | null;
  is_featured: boolean;
  vendor_id: string;
  category_id: string;
}

interface VendorCategory {
  id: string
  name: string
  slug: string
}

export default function ServicesPage() {
  const { isAuthenticated, profile } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, []) // Tidak bergantung pada auth state

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load categories
      const { data: categoriesData } = await supabase
        .from('vendor_categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name')

      setCategories(categoriesData || [])

      // Load ALL services (semua service ditampilkan)
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false })

      if (servicesData) {
        // Get vendor data for services
        const vendorIds = servicesData.map(s => s.vendor_id)
        const { data: vendorsData } = await supabase
          .from('vendors')
          .select(`
            id,
            business_name,
            location,
            average_rating,
            total_reviews,
            category_id,
            is_active
          `)
          .in('id', vendorIds)

        // Get category data
        const categoryIds = vendorsData?.map(v => v.category_id) || []
        const { data: categoriesForServices } = await supabase
          .from('vendor_categories')
          .select('id, name')
          .in('id', categoryIds)

        const vendorMap = new Map(vendorsData?.map(v => [v.id, v]) || [])
        const categoryMap = new Map(categoriesForServices?.map(c => [c.id, c.name]) || [])

        // Tampilkan semua services (tidak filter berdasarkan vendor aktif)
        const activeServices = servicesData

        const transformedServices: Service[] = activeServices.map(service => {
          const vendor = vendorMap.get(service.vendor_id)
          const categoryName = vendor ? categoryMap.get(vendor.category_id) : 'General'
          const serviceData = service as ServiceFromDB

          return {
            id: service.id,
            name: service.name,
            description: service.description,
            price: parseFloat(service.price?.toString() || '0'),
            images: serviceData.images || [],
            service_type: service.service_type,
            duration: service.duration,
            is_featured: Boolean(service.is_featured),
            vendor: {
              id: vendor?.id || '',
              business_name: vendor?.business_name || 'Unknown Vendor',
              location: vendor?.location || null,
              average_rating: parseFloat(vendor?.average_rating?.toString() || '0'),
              total_reviews: vendor?.total_reviews || 0
            },
            category: categoryName || 'General'
          }
        })

        setServices(transformedServices)
      }

    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter services berdasarkan kategori dan search
  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === 'all' || 
      service.category.toLowerCase().includes(selectedCategory.toLowerCase())
    
    const matchesSearch = searchQuery === '' ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.vendor.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesCategory && matchesSearch
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading services...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Semua Layanan Wedding
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Temukan layanan wedding terbaik dari vendor terpercaya untuk hari spesial Anda
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Cari layanan atau vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <div className="md:w-64">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {filteredServices.length} Layanan Ditemukan
            </h2>
            
            {/* Create Service Button - hanya untuk vendor */}
            {isAuthenticated && profile?.preferred_role === 'vendor' && (
              <Link
                href="/vendor/services/create"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tambah Layanan
              </Link>
            )}
          </div>

          {filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredServices.map((service) => (
                <Link 
                  key={service.id} 
                  href={`/services/${service.id}`}
                  className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  {/* Service Image */}
                  <div className="relative h-48 bg-gray-200">
                    {service.images && service.images.length > 0 ? (
                      <Image
                        src={service.images[0]}
                        alt={service.name}
                        layout="fill"
                        objectFit="cover"
                        className="group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-6xl text-gray-400">📸</div>
                      </div>
                    )}
                    
                    {/* Featured Badge */}
                    {service.is_featured && (
                      <div className="absolute top-3 left-3">
                        <span className="bg-yellow-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                          Featured
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Service Info */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {service.name}
                      </h3>
                      <div className="flex items-center ml-2">
                        <span className="text-yellow-400 mr-1">⭐</span>
                        <span className="text-sm text-gray-600">
                          {service.vendor.average_rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {service.description || 'Deskripsi layanan tidak tersedia'}
                    </p>

                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xl font-bold text-blue-600">
                        {formatPrice(service.price)}
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
                          <p className="text-xs text-blue-600 mt-1">
                            {service.category}
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
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Tidak Ada Layanan Ditemukan
              </h3>
              <p className="text-gray-600 mb-6">
                Coba ubah filter pencarian atau kata kunci yang berbeda
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('all')
                  setSearchQuery('')
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Reset Filter
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
} 