'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/AppLayout'
import { Tables } from '@/types/database'
import Link from 'next/link'

type Vendor = Tables<'vendors'> & {
  vendor_categories: {
    name: string
    slug: string
  }
}

type Category = Tables<'vendor_categories'>

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('vendor_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (categoriesError) {
        console.error('Error loading categories:', categoriesError)
      } else {
        setCategories(categoriesData || [])
      }

      // Load vendors with category info
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select(`
          *,
          vendor_categories(name, slug)
        `)
        .eq('is_active', true)
        .eq('verification_status', 'verified')
        .order('featured_status', { ascending: false })
        .order('average_rating', { ascending: false })

      if (vendorsError) {
        console.error('Error loading vendors:', vendorsError)
      } else {
        setVendors(vendorsData || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredVendors = vendors.filter(vendor => {
    const matchesCategory = selectedCategory === 'all' || vendor.category_id === selectedCategory
    const matchesSearch = vendor.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.location?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const formatPrice = (min: number | null, max: number | null) => {
    const formatter = (price: number) => {
      if (price >= 1000000) {
        return `${(price / 1000000).toFixed(0)}jt`
      } else if (price >= 1000) {
        return `${(price / 1000).toFixed(0)}k`
      }
      return price.toString()
    }

    if (min && max && min !== max) {
      return `Rp ${formatter(min)} - ${formatter(max)}`
    } else if (min) {
      return `Mulai Rp ${formatter(min)}`
    }
    return 'Harga tidak tersedia'
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat vendor...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Temukan Vendor Wedding Terbaik
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Jelajahi berbagai vendor profesional untuk membuat hari pernikahan Anda menjadi sempurna
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Cari vendor berdasarkan nama, layanan, atau lokasi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Semua Kategori
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vendors Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-6">
            <p className="text-gray-600">
              Menampilkan {filteredVendors.length} vendor
              {selectedCategory !== 'all' && (
                <span> dalam kategori {categories.find(c => c.id === selectedCategory)?.name}</span>
              )}
              {searchQuery && (
                <span> dengan pencarian &quot;{searchQuery}&quot;</span>
              )}
            </p>
          </div>

          {filteredVendors.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak Ada Vendor</h3>
              <p className="text-gray-500">
                {searchQuery || selectedCategory !== 'all' 
                  ? 'Tidak ada vendor yang sesuai dengan kriteria pencarian Anda.'
                  : 'Belum ada vendor yang terdaftar.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredVendors.map((vendor) => (
                <div key={vendor.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  {vendor.featured_status && (
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1">
                      FEATURED
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 flex-1">
                        {vendor.business_name}
                      </h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full ml-2">
                        {vendor.vendor_categories?.name || 'Vendor'}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {vendor.description || 'Deskripsi tidak tersedia'}
                    </p>

                    <div className="space-y-2 mb-4">
                      {vendor.location && (
                        <div className="flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {vendor.location}
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm">
                        <svg className="w-4 h-4 mr-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-gray-900">
                          {vendor.average_rating?.toFixed(1) || '0.0'}
                        </span>
                        <span className="text-gray-500 ml-1">
                          ({vendor.total_reviews} ulasan)
                        </span>
                      </div>

                      <div className="text-sm text-gray-600">
                        {formatPrice(vendor.min_price, vendor.max_price)}
                      </div>
                    </div>

                    <Link
                      href={`/vendor/services?vendorId=${vendor.id}`}
                      className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Lihat Layanan
                    </Link>
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