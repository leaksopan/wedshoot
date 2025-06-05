'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/AppLayout'

interface ServiceDetail {
  id: string
  name: string
  description: string
  price: number
  duration: number | null
  service_type: string
  includes: string[]
  excludes: string[]
  terms_conditions: string | null
  max_revisions: number | null
  delivery_time: number | null
  advance_booking_days: number | null
  max_guests: number | null
  images: string[]
  vendor: {
    id: string
    business_name: string
    location: string | null
    average_rating: number
    total_reviews: number
    user_id: string
  }
  category: {
    name: string
    slug: string
  }
}

interface LightboxProps {
  images: string[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onNext: () => void
  onPrev: () => void
}

const Lightbox: React.FC<LightboxProps> = ({ images, currentIndex, isOpen, onClose, onNext, onPrev }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="relative max-w-7xl max-h-full p-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={onPrev}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={onNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Main Image */}
        <img
          src={images[currentIndex]}
          alt={`Gallery image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
        />

        {/* Image Counter */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-3 py-1 rounded">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  )
}

export default function ServiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const serviceId = params.id as string

  const [service, setService] = useState<ServiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (serviceId) {
      loadServiceDetail()
    }
  }, [serviceId])

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (service?.images && service.images.length > 1) {
        if (event.key === 'ArrowLeft') {
          prevImage()
        } else if (event.key === 'ArrowRight') {
          nextImage()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [service?.images])

  const loadServiceDetail = async () => {
    try {
      // Get service data
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .eq('is_active', true)
        .single()

      if (serviceError || !serviceData) {
        console.error('Service not found:', serviceError)
        router.push('/services')
        return
      }

      // Get vendor data
      const { data: vendorData } = await supabase
        .from('vendors')
        .select(`
          id,
          business_name,
          location,
          average_rating,
          total_reviews,
          user_id,
          category_id
        `)
        .eq('id', serviceData.vendor_id)
        .single()

      // Get category data
      const { data: categoryData } = await supabase
        .from('vendor_categories')
        .select('name, slug')
        .eq('id', vendorData?.category_id || '')
        .single()

      if (vendorData && categoryData) {
        const transformedService: ServiceDetail = {
          id: serviceData.id,
          name: serviceData.name,
          description: serviceData.description || '',
          price: parseFloat(serviceData.price?.toString() || '0'),
          duration: serviceData.duration,
          service_type: serviceData.service_type || '',
          includes: Array.isArray(serviceData.includes) ? serviceData.includes.filter((item): item is string => typeof item === 'string') : [],
          excludes: Array.isArray(serviceData.excludes) ? serviceData.excludes.filter((item): item is string => typeof item === 'string') : [],
          terms_conditions: serviceData.terms_conditions,
          max_revisions: serviceData.max_revisions,
          delivery_time: serviceData.delivery_time,
          advance_booking_days: serviceData.advance_booking_days,
          max_guests: serviceData.max_guests,
          images: (serviceData as any).images || [],
          vendor: {
            id: vendorData.id,
            business_name: vendorData.business_name,
            location: vendorData.location,
            average_rating: parseFloat(vendorData.average_rating?.toString() || '0'),
            total_reviews: vendorData.total_reviews || 0,
            user_id: vendorData.user_id
          },
          category: {
            name: categoryData.name,
            slug: categoryData.slug || 'general'
          }
        }

        setService(transformedService)
      }
    } catch (error) {
      console.error('Error loading service detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  const nextImage = () => {
    if (service?.images) {
      setLightboxIndex((lightboxIndex + 1) % service.images.length)
    }
  }

  const prevImage = () => {
    if (service?.images) {
      setLightboxIndex((lightboxIndex - 1 + service.images.length) % service.images.length)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading service details...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!service) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Not Found</h2>
            <p className="text-gray-600 mb-6">The service you're looking for doesn't exist or has been removed.</p>
            <Link
              href="/services"
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Browse All Services
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="bg-gray-50 min-h-screen">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <nav className="text-sm">
              <ol className="flex items-center space-x-2 text-gray-500">
                <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
                <li>›</li>
                <li><Link href="/services" className="hover:text-blue-600">Services</Link></li>
                <li>›</li>
                <li><Link href={`/categories/${service.category.slug}`} className="hover:text-blue-600">{service.category.name}</Link></li>
                <li>›</li>
                <li className="text-gray-900 font-medium">{service.name}</li>
              </ol>
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mr-4">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{service.name}</h1>
                <p className="text-gray-600">
                  by <Link href={`/vendors/${service.vendor.id}`} className="text-blue-600 hover:text-blue-700">{service.vendor.business_name}</Link> — {service.category.name}
                </p>
              </div>
            </div>
            
            {/* Tags */}
            <div className="flex items-center space-x-2 mb-6">
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">wedding</span>
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">photography</span>
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">cinematic</span>
            </div>
          </div>

          {/* Image Gallery Carousel */}
          {service.images.length > 0 && (
            <div className="mb-8 flex justify-center">
              <div className="relative rounded-lg overflow-hidden bg-gray-200" style={{ width: '560px', height: '280px' }}>
                {/* Main Image */}
                <img
                  src={service.images[lightboxIndex]}
                  alt={`${service.name} - Image ${lightboxIndex + 1}`}
                  width="560"
                  height="280"
                  className="w-full h-full object-contain cursor-pointer transition-opacity duration-300 bg-gray-100"
                  onClick={() => openLightbox(lightboxIndex)}
                />

                {/* Navigation Arrows */}
                {service.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full transition-all duration-300"
                      aria-label="Previous image"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full transition-all duration-300"
                      aria-label="Next image"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Fade Effect on Edges */}
                <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-black/20 to-transparent pointer-events-none"></div>
                <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-black/20 to-transparent pointer-events-none"></div>

                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  {lightboxIndex + 1} / {service.images.length}
                </div>

                {/* Thumbnail Dots */}
                {service.images.length > 1 && (
                  <div className="absolute bottom-4 right-4 flex space-x-2">
                    {service.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setLightboxIndex(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                          index === lightboxIndex 
                            ? 'bg-white' 
                            : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                        }`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Package Description */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Details</h2>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="font-medium text-gray-900 mb-3">{service.name} :</h3>
                  <div className="prose max-w-none text-gray-600">
                    <p className="whitespace-pre-line">{service.description}</p>
                  </div>
                  
                  {/* Includes */}
                  {service.includes.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-3">Yang Termasuk:</h4>
                      <ul className="space-y-2">
                        {service.includes.map((item, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-green-500 mr-2">✓</span>
                            <span className="text-gray-600">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Excludes */}
                  {service.excludes.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-3">Yang Tidak Termasuk:</h4>
                      <ul className="space-y-2">
                        {service.excludes.map((item, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-red-500 mr-2">✗</span>
                            <span className="text-gray-600">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Service Details */}
                  <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t">
                    {service.duration && (
                      <div>
                        <span className="text-sm text-gray-500">Durasi</span>
                        <p className="font-medium">{service.duration} jam</p>
                      </div>
                    )}
                    {service.max_revisions && (
                      <div>
                        <span className="text-sm text-gray-500">Max Revisi</span>
                        <p className="font-medium">{service.max_revisions}x</p>
                      </div>
                    )}
                    {service.delivery_time && (
                      <div>
                        <span className="text-sm text-gray-500">Waktu Pengiriman</span>
                        <p className="font-medium">{service.delivery_time} hari</p>
                      </div>
                    )}
                    {service.max_guests && (
                      <div>
                        <span className="text-sm text-gray-500">Max Guests</span>
                        <p className="font-medium">{service.max_guests} orang</p>
                      </div>
                    )}
                  </div>

                  {/* Terms & Conditions */}
                  {service.terms_conditions && (
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="font-medium text-gray-900 mb-2">Syarat & Ketentuan</h4>
                      <p className="text-gray-600 text-sm whitespace-pre-line">{service.terms_conditions}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vendor Profile */}
              <div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mr-4">
                        <span className="text-white font-bold">W</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{service.vendor.business_name}</h3>
                        <p className="text-sm text-gray-600">{service.category.name} - {service.vendor.location || 'Location TBD'}</p>
                      </div>
                    </div>
                    <Link 
                      href={`/vendors/${service.vendor.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Kunjungi Profil Vendor
                    </Link>
                  </div>
                  
                  <div className="flex items-center mb-4">
                    <div className="flex items-center mr-4">
                      <span className="text-yellow-400 mr-1">⭐</span>
                      <span className="font-medium">{service.vendor.average_rating}</span>
                    </div>
                    <span className="text-gray-600 text-sm">{service.vendor.total_reviews} reviews</span>
                  </div>

                  <p className="text-sm text-gray-600">
                    <strong>Lokasi:</strong> {service.vendor.location || 'Jakarta, ID'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Pricing */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 shadow-sm sticky top-8">
                <div className="mb-6">
                  <span className="text-sm text-gray-500">Harga</span>
                  <div className="text-2xl font-bold text-gray-900">
                    Rp {service.price.toLocaleString('id-ID')}
                  </div>
                </div>

                {/* Quantity */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah</label>
                  <div className="flex items-center border rounded-md">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 text-center border-0 focus:ring-0 focus:outline-none"
                      min="1"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-2 hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors">
                    Pesan Sekarang
                  </button>
                  <button className="w-full border border-red-500 text-red-500 py-3 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-4 text-center">
                  Chat untuk informasi lebih lanjut & kustomisasi produk
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {service.images.length > 0 && (
        <Lightbox
          images={service.images}
          currentIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}
    </AppLayout>
  )
} 