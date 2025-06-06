'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/AppLayout'
import BookingCalendar from '@/components/BookingCalendar'
import ChatModal from '@/components/ChatModal'
import { useAuth } from '@/hooks/useAuth'

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

interface ServiceFromDB {
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
  vendor_id: string
  category_id: string
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
        <Image
          src={images[currentIndex]}
          alt={`Gallery image ${currentIndex + 1}`}
          layout="fill"
          objectFit="contain"
          className="max-w-full max-h-full"
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
  const { isAuthenticated, user, profile, refreshProfile } = useAuth()

  const [service, setService] = useState<ServiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  
  // Booking states
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [bookingLoading, setBookingLoading] = useState(false)
  
  // Chat states
  const [showChatModal, setShowChatModal] = useState(false)

  const loadServiceDetail = useCallback(async () => {
    try {
      // Get service data - tidak bergantung pada authentication
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
        const serviceRecord = serviceData as ServiceFromDB
        const transformedService: ServiceDetail = {
          id: serviceRecord.id,
          name: serviceRecord.name,
          description: serviceRecord.description || '',
          price: parseFloat(serviceRecord.price?.toString() || '0'),
          duration: serviceRecord.duration,
          service_type: serviceRecord.service_type || '',
          includes: Array.isArray(serviceRecord.includes) ? serviceRecord.includes.filter((item: unknown): item is string => typeof item === 'string') : [],
          excludes: Array.isArray(serviceRecord.excludes) ? serviceRecord.excludes.filter((item: unknown): item is string => typeof item === 'string') : [],
          terms_conditions: serviceRecord.terms_conditions,
          max_revisions: serviceRecord.max_revisions,
          delivery_time: serviceRecord.delivery_time,
          advance_booking_days: serviceRecord.advance_booking_days,
          max_guests: serviceRecord.max_guests,
          images: serviceRecord.images || [],
          vendor: {
            id: vendorData.id,
            business_name: vendorData.business_name,
            location: vendorData.location,
            average_rating: parseFloat(vendorData.average_rating?.toString() || '0'),
            total_reviews: vendorData.total_reviews,
            user_id: vendorData.user_id,
          },
          category: {
            name: categoryData.name,
            slug: categoryData.slug,
          },
        }
        setService(transformedService)
      }
    } catch (error) {
      console.error('Error loading service detail:', error)
    } finally {
      setLoading(false)
    }
  }, [serviceId, router])

  useEffect(() => {
    if (serviceId) {
      loadServiceDetail()
    }
  }, [serviceId, loadServiceDetail])

  const nextImage = useCallback(() => {
    setLightboxIndex((prevIndex) =>
      prevIndex === (service?.images?.length ?? 0) - 1 ? 0 : prevIndex + 1
    )
  }, [service?.images?.length])

  const prevImage = useCallback(() => {
    setLightboxIndex((prevIndex) =>
      prevIndex === 0 ? (service?.images?.length ?? 0) - 1 : prevIndex - 1
    )
  }, [service?.images?.length])

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
  }, [service?.images, prevImage, nextImage])

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  const handleBookNowClick = () => {
    if (!isAuthenticated) {
      alert('Silakan login terlebih dahulu untuk melakukan booking')
      router.push('/auth/login')
      return
    }

    if (profile?.preferred_role === 'vendor') {
      alert('Vendor tidak dapat melakukan booking layanan')
      return
    }

    if (selectedDates.length === 0) {
      alert('Silakan pilih minimal satu tanggal untuk booking')
      return
    }

    // Show confirmation modal and prevent body scroll
    setShowBookingModal(true)
    document.body.style.overflow = 'hidden'
  }

  const handleBookingSubmit = async () => {
    if (!isAuthenticated || !user || !service) return

    if (selectedDates.length === 0) {
      alert('Silakan pilih minimal satu tanggal untuk booking')
      return
    }

    try {
      setBookingLoading(true)

      await supabase.from('bookings').insert({
        client_id: user.id,
        vendor_id: service.vendor.id,
        service_id: service.id,
        booking_dates: selectedDates.map(d => d.toISOString()),
        quantity,
        total_price: service.price * quantity,
        status: 'pending',
        client_email: user.email || '',
        notes: null
      })

      setShowBookingModal(false)
      document.body.style.overflow = 'unset'
      setSelectedDates([])
      
      // Refresh profile to ensure latest data
      await refreshProfile()
      
      // Delay redirect to ensure auth state is stable
      setTimeout(() => {
        router.push('/client/bookings')
      }, 1000)

    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Terjadi kesalahan saat melakukan booking.')
    } finally {
      setBookingLoading(false)
    }
  }

  const handleContactVendor = () => {
    if (!isAuthenticated) {
      alert('Silakan login terlebih dahulu untuk menghubungi vendor')
      router.push('/auth/login')
      return
    }

    if (profile?.preferred_role === 'vendor') {
      alert('Vendor tidak dapat menghubungi klien')
      return
    }

    setShowChatModal(true)
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
            <p className="text-gray-600 mb-6">The service you&apos;re looking for doesn&apos;t exist or has been removed.</p>
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
                <Image
                  src={service.images[lightboxIndex]}
                  alt={`${service.name} - Image ${lightboxIndex + 1}`}
                  width={560}
                  height={280}
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

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Content (2/3) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Deskripsi</h2>
                <p className="text-gray-700 leading-relaxed">{service.description}</p>
              </div>

              {/* What's Included */}
              {service.includes.length > 0 && (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">What&apos;s Included</h2>
                  <ul className="space-y-2">
                    {service.includes.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What's Excluded */}
              {service.excludes.length > 0 && (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">What&apos;s Not Included</h2>
                  <ul className="space-y-2">
                    {service.excludes.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Service Details */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Detail Layanan</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {service.duration && (
                    <div>
                      <span className="text-sm text-gray-500">Durasi</span>
                      <p className="font-medium">{service.duration} jam</p>
                    </div>
                  )}
                  {service.max_guests && (
                    <div>
                      <span className="text-sm text-gray-500">Max Tamu</span>
                      <p className="font-medium">{service.max_guests} orang</p>
                    </div>
                  )}
                  {service.delivery_time && (
                    <div>
                      <span className="text-sm text-gray-500">Waktu Pengerjaan</span>
                      <p className="font-medium">{service.delivery_time} hari</p>
                    </div>
                  )}
                  {service.max_revisions && (
                    <div>
                      <span className="text-sm text-gray-500">Max Revisi</span>
                      <p className="font-medium">{service.max_revisions}x</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Terms & Conditions */}
              {service.terms_conditions && (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Syarat & Ketentuan</h2>
                  <p className="text-gray-700 text-sm leading-relaxed">{service.terms_conditions}</p>
                </div>
              )}

              {/* Vendor Info */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Tentang Vendor</h2>
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {service.vendor.business_name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">{service.vendor.business_name}</h3>
                    <div className="flex items-center mt-1 mb-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(service.vendor.average_rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <span className="ml-2 text-sm text-gray-600">{service.vendor.average_rating}</span>
                      </div>
                      <span className="text-gray-600 text-sm ml-2">({service.vendor.total_reviews} reviews)</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      <strong>Lokasi:</strong> {service.vendor.location || 'Jakarta, ID'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Booking (1/3) */}
            <div className="lg:col-span-1">
              {/* Pricing Card */}
              <div className="bg-white rounded-lg p-6 shadow-sm sticky top-8 space-y-6">
                <div>
                  <span className="text-sm text-gray-500">Harga</span>
                  <div className="text-2xl font-bold text-gray-900">
                    Rp {service.price.toLocaleString('id-ID')}
                  </div>
                </div>

                {/* Quantity */}
                <div>
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

                {/* Calendar */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Pilih Tanggal</h3>
                  <BookingCalendar
                    vendorId={service.vendor.id}
                    selectedDates={selectedDates}
                    onDatesChange={setSelectedDates}
                  />
                </div>

                {/* Selected Dates Summary */}
                {selectedDates.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Harga per hari:</span>
                      <span className="font-medium">Rp {service.price.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Jumlah:</span>
                      <span className="font-medium">{quantity}x</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Tanggal terpilih:</span>
                      <span className="font-medium">{selectedDates.length} hari</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>Rp {(service.price * quantity * selectedDates.length).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button 
                    onClick={handleBookNowClick}
                    disabled={selectedDates.length === 0}
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      selectedDates.length === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    {selectedDates.length === 0 ? 'Pilih Tanggal Terlebih Dahulu' : 'Pesan Sekarang'}
                  </button>
                  <button 
                    onClick={handleContactVendor}
                    className="w-full border border-red-500 text-red-500 py-3 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat Vendor
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Chat untuk informasi lebih lanjut & kustomisasi layanan
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

      {/* Booking Confirmation Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirm Booking</h2>
            <div className="space-y-3 text-gray-700">
              <p><strong>Service:</strong> {service.name}</p>
              <p><strong>Vendor:</strong> {service.vendor.business_name}</p>
              <p><strong>Dates:</strong> {selectedDates.map(d => d.toLocaleDateString()).join(', ')}</p>
              <p><strong>Quantity:</strong> {quantity}</p>
              <p className="text-xl font-bold">
                <strong>Total Price:</strong> {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(service.price * quantity)}
              </p>
            </div>
            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowBookingModal(false)
                  document.body.style.overflow = 'unset'
                }}
                disabled={bookingLoading}
                className="px-6 py-2 border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBookingSubmit}
                disabled={bookingLoading}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center"
              >
                {bookingLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Processing...
                  </>
                ) : (
                  'Confirm & Book'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && service && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          vendorId={service.vendor.user_id}
          vendorName={service.vendor.business_name}
          serviceName={service.name}
        />
      )}
    </AppLayout>
  )
} 