'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/AppLayout'
import { Tables } from '@/types/database'
import Link from 'next/link'

type VendorInfo = Tables<'vendors'>
type Service = Tables<'services'>

export default function VendorServicesPage() {
  const searchParams = useSearchParams()
  const vendorId = searchParams.get('vendorId')
  
  const [vendor, setVendor] = useState<VendorInfo | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (vendorId) {
      loadVendorAndServices()
    } else {
      setError('Vendor ID tidak ditemukan')
      setLoading(false)
    }
  }, [vendorId])

  const loadVendorAndServices = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load vendor info
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId!)
        .single()

      if (vendorError || !vendorData) {
        throw new Error('Vendor tidak ditemukan')
      }

      setVendor(vendorData)

      // Load vendor services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('vendor_id', vendorId!)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (servicesError) {
        throw new Error('Gagal memuat layanan vendor')
      }

      setServices(servicesData || [])
    } catch (error: any) {
      console.error('Error loading vendor services:', error)
      setError(error.message || 'Terjadi kesalahan saat memuat data')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const formatDuration = (duration: number | null) => {
    if (!duration) return 'Tidak ditentukan'
    return `${duration} jam`
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat layanan vendor...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Vendor Header */}
          {vendor && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {vendor.business_name}
                  </h1>
                  {vendor.description && (
                    <p className="text-gray-600 mb-4">{vendor.description}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    {vendor.location && (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {vendor.location}
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {vendor.average_rating?.toFixed(1) || '0.0'} ({vendor.total_reviews || 0} ulasan)
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 md:mt-0">
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Hubungi Vendor
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Services Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Layanan Tersedia ({services.length})
              </h2>
            </div>

            {services.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m-2 0v5a2 2 0 002 2h2M4 13v-5a2 2 0 012-2h2m12 0V6a2 2 0 00-2-2h-2m2 2h2v7" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Layanan</h3>
                <p className="text-gray-500">Vendor ini belum menambahkan layanan apapun.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                  <div key={service.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex-1">
                        {service.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        service.service_type === 'package' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {service.service_type === 'package' ? 'Paket' : 'Individual'}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {service.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Harga:</span>
                        <span className="font-semibold text-blue-600">
                          {formatPrice(service.price)}
                        </span>
                      </div>
                      
                      {service.duration && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Durasi:</span>
                          <span className="text-gray-900">{formatDuration(service.duration)}</span>
                        </div>
                      )}
                      
                      {service.max_guests && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Max Tamu:</span>
                          <span className="text-gray-900">{service.max_guests} orang</span>
                        </div>
                      )}
                    </div>

                    {service.includes && Array.isArray(service.includes) && service.includes.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Termasuk:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {service.includes.slice(0, 3).map((item: any, index: number) => (
                            <li key={index} className="flex items-start">
                              <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {item}
                            </li>
                          ))}
                          {service.includes.length > 3 && (
                            <li className="text-xs text-gray-500">
                              +{service.includes.length - 3} lainnya
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                      <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        Pesan Layanan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
} 