'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/AppLayout'

interface VendorInfo {
  id: string
  business_name: string
  category_id: string
}

interface ServiceFormData {
  name: string
  description: string
  price: string
  duration: string
  service_type: 'package' | 'individual'
  includes: string[]
  excludes: string[]
  terms_conditions: string
  cancellation_policy: string
  max_revisions: string
  delivery_time: string
  advance_booking_days: string
  max_guests: string
  images: string[]
}

interface UploadedImage {
  file: File
  preview: string
  uploading: boolean
  error?: string
}

export default function CreateServicePage() {
  const { isAuthenticated, user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newInclude, setNewInclude] = useState('')
  const [newExclude, setNewExclude] = useState('')
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    price: '',
    duration: '',
    service_type: 'package',
    includes: [],
    excludes: [],
    terms_conditions: '',
    cancellation_policy: '',
    max_revisions: '3',
    delivery_time: '14',
    advance_booking_days: '7',
    max_guests: '',
    images: []
  })
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [dragActive, setDragActive] = useState(false)

  // Cleanup image URLs on unmount
  useEffect(() => {
    return () => {
      uploadedImages.forEach(image => {
        URL.revokeObjectURL(image.preview)
      })
    }
  }, [uploadedImages])

  const loadVendorInfo = useCallback(async () => {
    if (!user) return

    try {
      const { data: vendor, error } = await supabase
        .from('vendors')
        .select('id, business_name, category_id')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error loading vendor info:', error)
        alert('Anda belum terdaftar sebagai vendor. Silakan lengkapi profil vendor terlebih dahulu.')
        router.push('/dashboard')
        return
      }

      setVendorInfo(vendor)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [user, router])

  useEffect(() => {
    // Debug logs (hapus di production)
    console.log('🔍 Create Service Auth Check:', { 
      authLoading, 
      isAuthenticated, 
      preferredRole: profile?.preferred_role 
    })

    // Tunggu auth loading selesai sebelum melakukan redirect
    if (authLoading) return

    if (!isAuthenticated) {
      console.log('❌ Not authenticated, redirecting to login')
      router.push('/login')
      return
    }

    if (profile?.preferred_role !== 'vendor') {
      console.log('❌ Not vendor role, redirecting to dashboard')
      router.push('/dashboard')
      return
    }

    console.log('✅ Auth check passed, loading vendor info')
    loadVendorInfo()
  }, [isAuthenticated, profile, authLoading, router, loadVendorInfo])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const addInclude = () => {
    if (newInclude.trim()) {
      setFormData(prev => ({
        ...prev,
        includes: [...prev.includes, newInclude.trim()]
      }))
      setNewInclude('')
    }
  }

  const removeInclude = (index: number) => {
    setFormData(prev => ({
      ...prev,
      includes: prev.includes.filter((_, i) => i !== index)
    }))
  }

  const addExclude = () => {
    if (newExclude.trim()) {
      setFormData(prev => ({
        ...prev,
        excludes: [...prev.excludes, newExclude.trim()]
      }))
      setNewExclude('')
    }
  }

  const removeExclude = (index: number) => {
    setFormData(prev => ({
      ...prev,
      excludes: prev.excludes.filter((_, i) => i !== index)
    }))
  }

  // Image upload functions
  const generateUniqueFileName = (originalName: string): string => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const extension = originalName.split('.').pop()
    return `service-${timestamp}-${random}.${extension}`
  }

  const uploadImageToStorage = async (file: File): Promise<string> => {
    const fileName = generateUniqueFileName(file.name)
    const filePath = `services/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  }

  const handleFileSelect = async (files: FileList) => {
    const fileArray = Array.from(files)
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      alert('Harap pilih file gambar yang valid!')
      return
    }

    // Check file size (max 5MB per file)
    const oversizedFiles = imageFiles.filter(file => file.size > 5 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      alert('Ukuran file terlalu besar! Maksimal 5MB per file.')
      return
    }

    // Add to uploaded images with preview
    const newImages: UploadedImage[] = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false
    }))

    setUploadedImages(prev => [...prev, ...newImages])
  }

  const uploadAllImages = async (): Promise<string[]> => {
    const uploadPromises = uploadedImages.map(async (imageData, index) => {
      if (imageData.uploading) return null

      try {
        // Update status to uploading
        setUploadedImages(prev => 
          prev.map((img, i) => 
            i === index ? { ...img, uploading: true, error: undefined } : img
          )
        )

        const url = await uploadImageToStorage(imageData.file)
        
        // Update status to completed
        setUploadedImages(prev => 
          prev.map((img, i) => 
            i === index ? { ...img, uploading: false } : img
          )
        )

        return url
      } catch (error) {
        console.error('Upload error:', error)
        
        // Update status to error
        setUploadedImages(prev => 
          prev.map((img, i) => 
            i === index ? { ...img, uploading: false, error: error instanceof Error ? error.message : 'Upload failed' } : img
          )
        )

        return null
      }
    })

    const results = await Promise.all(uploadPromises)
    return results.filter((url): url is string => url !== null)
  }

  const removeImage = (index: number) => {
    setUploadedImages(prev => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendorInfo) {
      alert('Informasi vendor tidak ditemukan.')
      return
    }

    try {
      const imageUrls = await uploadAllImages()
      
      const servicePayload = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        duration: parseInt(formData.duration, 10) || null,
        max_revisions: parseInt(formData.max_revisions, 10) || 0,
        delivery_time: parseInt(formData.delivery_time, 10) || 0,
        advance_booking_days: parseInt(formData.advance_booking_days, 10) || 0,
        max_guests: parseInt(formData.max_guests, 10) || null,
        images: imageUrls,
        vendor_id: vendorInfo.id,
        category_id: vendorInfo.category_id,
        is_active: true,
        is_featured: false
      }

      const { error } = await supabase
        .from('services')
        .insert(servicePayload)

      if (error) {
        console.error('Error creating service:', error)
        if (error instanceof Error) {
          alert(`Gagal membuat layanan: ${error.message}`)
        } else {
          alert('Gagal membuat layanan: Terjadi kesalahan tidak terduga.')
        }
      } else {
        alert('Layanan berhasil dibuat!')
        router.push('/vendor/services')
      }
    } catch (error) {
      console.error('Error creating service:', error)
      if (error instanceof Error) {
        alert(`Gagal membuat layanan: ${error.message}`)
      } else {
        alert('Gagal membuat layanan: Terjadi kesalahan tidak terduga.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
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

  if (!vendorInfo) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-gray-600">Vendor information not found</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Buat Paket Layanan Baru
            </h1>
            <p className="text-gray-600">
              Tambahkan paket layanan untuk {vendorInfo.business_name}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Paket *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Paket Prewedding Premium"
                  required
                />
              </div>

              <div>
                <label htmlFor="service_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Layanan
                </label>
                <select
                  id="service_type"
                  name="service_type"
                  value={formData.service_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="package">Paket</option>
                  <option value="individual">Individual</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Deskripsi *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jelaskan detail paket layanan Anda..."
                required
              />
            </div>

            {/* Image Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto Portfolio Layanan *
              </label>
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips Upload Foto Portfolio:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Upload foto dengan kualitas tinggi (minimal 1080p)</li>
                  <li>• Pilih foto terbaik yang merepresentasikan layanan Anda</li>
                  <li>• Sertakan berbagai angle dan momen penting</li>
                  <li>• Maksimal 5MB per file, format JPG/PNG/WebP</li>
                </ul>
              </div>
              
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      Drag & drop foto di sini
                    </p>
                    <p className="text-sm text-gray-500">
                      atau klik untuk memilih file
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                    className="hidden"
                    id="image-upload"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Pilih Foto
                  </button>
                </div>
              </div>

              {/* Image Preview Grid */}
              {uploadedImages.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-700">
                      Preview Foto ({uploadedImages.length} foto)
                    </h4>
                    <p className="text-sm text-gray-500">
                      Total size: {(uploadedImages.reduce((acc, img) => acc + img.file.size, 0) / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {uploadedImages.map((imageData, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={imageData.preview}
                            alt={`Preview ${index + 1}`}
                            width={200}
                            height={200}
                            className="w-full h-full object-cover"
                          />
                          {imageData.uploading && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <div className="flex flex-col items-center space-y-2">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                <span className="text-white text-xs">Uploading...</span>
                              </div>
                            </div>
                          )}
                          {imageData.error && (
                            <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center">
                              <div className="text-center">
                                <span className="text-white text-xs">Error</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                        {imageData.error && (
                          <p className="text-xs text-red-600 mt-1 truncate">
                            {imageData.error}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pricing and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  Harga (Rp) *
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 5000000"
                  required
                />
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Durasi (jam)
                </label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 4"
                />
              </div>

              <div>
                <label htmlFor="max_guests" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Guests
                </label>
                <input
                  type="number"
                  id="max_guests"
                  name="max_guests"
                  value={formData.max_guests}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 100"
                />
              </div>
            </div>

            {/* What's Included */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yang Termasuk
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newInclude}
                    onChange={(e) => setNewInclude(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 100 foto editing"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInclude())}
                  />
                  <button
                    type="button"
                    onClick={addInclude}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Tambah
                  </button>
                </div>
                <div className="space-y-1">
                  {formData.includes.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-sm">{item}</span>
                      <button
                        type="button"
                        onClick={() => removeInclude(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* What's Excluded */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yang Tidak Termasuk
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newExclude}
                    onChange={(e) => setNewExclude(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Biaya transportasi"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExclude())}
                  />
                  <button
                    type="button"
                    onClick={addExclude}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Tambah
                  </button>
                </div>
                <div className="space-y-1">
                  {formData.excludes.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-sm">{item}</span>
                      <button
                        type="button"
                        onClick={() => removeExclude(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Delivery & Revision Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="delivery_time" className="block text-sm font-medium text-gray-700 mb-2">
                  Waktu Pengiriman (hari)
                </label>
                <input
                  type="number"
                  id="delivery_time"
                  name="delivery_time"
                  value={formData.delivery_time}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="14"
                />
              </div>

              <div>
                <label htmlFor="max_revisions" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Revisi
                </label>
                <input
                  type="number"
                  id="max_revisions"
                  name="max_revisions"
                  value={formData.max_revisions}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="3"
                />
              </div>

              <div>
                <label htmlFor="advance_booking_days" className="block text-sm font-medium text-gray-700 mb-2">
                  Min Booking (hari)
                </label>
                <input
                  type="number"
                  id="advance_booking_days"
                  name="advance_booking_days"
                  value={formData.advance_booking_days}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="7"
                />
              </div>
            </div>

            {/* Terms and Policies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="terms_conditions" className="block text-sm font-medium text-gray-700 mb-2">
                  Syarat dan Ketentuan
                </label>
                <textarea
                  id="terms_conditions"
                  name="terms_conditions"
                  value={formData.terms_conditions}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tulis syarat dan ketentuan layanan..."
                />
              </div>

              <div>
                <label htmlFor="cancellation_policy" className="block text-sm font-medium text-gray-700 mb-2">
                  Kebijakan Pembatalan
                </label>
                <textarea
                  id="cancellation_policy"
                  name="cancellation_policy"
                  value={formData.cancellation_policy}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tulis kebijakan pembatalan..."
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {submitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>
                  {submitting 
                    ? uploadedImages.length > 0 
                      ? 'Mengupload & Menyimpan...' 
                      : 'Menyimpan...'
                    : 'Buat Paket'
                  }
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </AppLayout>
  )
} 