'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  is_active: boolean
  is_featured: boolean
}

interface UploadedImage {
  file: File
  preview: string
  uploading: boolean
  error?: string
}

interface ExistingImage {
  url: string
  isExisting: boolean
}

export default function EditServicePage() {
  const { isAuthenticated, user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const serviceId = params?.id as string

  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newInclude, setNewInclude] = useState('')
  const [newExclude, setNewExclude] = useState('')
  const [originalData, setOriginalData] = useState<ServiceFormData | null>(null)
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
    images: [],
    is_active: true,
    is_featured: false
  })
  
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([])
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)

  // Cleanup image URLs on unmount
  useEffect(() => {
    return () => {
      uploadedImages.forEach(image => {
        URL.revokeObjectURL(image.preview)
      })
    }
  }, [uploadedImages])

  const loadServiceData = useCallback(async () => {
    if (!user || !serviceId) return

    try {
      // Load vendor info
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('id, business_name, category_id')
        .eq('user_id', user.id)
        .single()

      if (vendorError) {
        console.error('Error loading vendor info:', vendorError)
        alert('Anda belum terdaftar sebagai vendor.')
        router.push('/dashboard')
        return
      }

      setVendorInfo(vendor)

      // Load service data
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .eq('vendor_id', vendor.id) // Pastikan service milik vendor ini
        .single()

      if (serviceError) {
        console.error('Error loading service:', serviceError)
        alert('Service tidak ditemukan atau bukan milik Anda.')
        router.push('/vendor/services')
        return
      }

      // Convert service data to form format
      const serviceFormData: ServiceFormData = {
        name: service.name || '',
        description: service.description || '',
        price: service.price?.toString() || '',
        duration: service.duration?.toString() || '',
        service_type: (service.service_type as 'package' | 'individual') || 'package',
        includes: Array.isArray(service.includes) ? (service.includes as unknown[]).filter((i): i is string => typeof i === 'string') : [],
        excludes: Array.isArray(service.excludes) ? (service.excludes as unknown[]).filter((i): i is string => typeof i === 'string') : [],
        terms_conditions: service.terms_conditions || '',
        cancellation_policy: service.cancellation_policy || '',
        max_revisions: service.max_revisions?.toString() || '3',
        delivery_time: service.delivery_time?.toString() || '14',
        advance_booking_days: service.advance_booking_days?.toString() || '7',
        max_guests: service.max_guests?.toString() || '',
        images: Array.isArray(service.images) ? (service.images as unknown[]).filter((i): i is string => typeof i === 'string') : [],
        is_active: service.is_active ?? true,
        is_featured: service.is_featured ?? false
      }

      setOriginalData(serviceFormData)
      setFormData(serviceFormData)

      // Set existing images
      if (service.images && Array.isArray(service.images) && service.images.length > 0) {
        const existingImgs = (service.images as string[]).map((url: string) => ({
          url,
          isExisting: true
        }))
        setExistingImages(existingImgs)
      }

    } catch (error) {
      console.error('Error:', error)
      alert('Terjadi kesalahan saat memuat data service.')
      router.push('/vendor/services')
    } finally {
      setLoading(false)
    }
  }, [user, serviceId, router])

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    if (profile?.preferred_role !== 'vendor') {
      router.push('/dashboard')
      return
    }

    loadServiceData()
  }, [isAuthenticated, profile, authLoading, serviceId, loadServiceData, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
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

  // Image functions
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
    
    // Validate files
    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} bukan file gambar yang valid`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert(`${file.name} terlalu besar. Maksimal 5MB per file`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    // Add to uploaded images state
    const newImages: UploadedImage[] = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false
    }))

    setUploadedImages(prev => [...prev, ...newImages])
  }

  const uploadAllImages = async (): Promise<string[]> => {
    const uploadPromises = uploadedImages.map(async (imageData, index) => {
      if (imageData.uploading) return null

      // Update uploading state
      setUploadedImages(prev => 
        prev.map((img, i) => 
          i === index ? { ...img, uploading: true, error: undefined } : img
        )
      )

      try {
        const url = await uploadImageToStorage(imageData.file)
        
        // Update success state
        setUploadedImages(prev => 
          prev.map((img, i) => 
            i === index ? { ...img, uploading: false } : img
          )
        )
        
        return url
      } catch (error) {
        console.error('Upload error:', error)
        
        // Update error state
        setUploadedImages(prev => 
          prev.map((img, i) => 
            i === index ? { 
              ...img, 
              uploading: false, 
              error: error instanceof Error ? error.message : 'Upload failed' 
            } : img
          )
        )
        
        return null
      }
    })

    const results = await Promise.all(uploadPromises)
    return results.filter((url): url is string => url !== null)
  }

  const removeUploadedImage = (index: number) => {
    const imageToRemove = uploadedImages[index]
    URL.revokeObjectURL(imageToRemove.preview)
    
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (url: string) => {
    setExistingImages(prev => prev.filter(img => img.url !== url))
    setImagesToDelete(prev => [...prev, url])
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
    if (files?.length > 0) {
      handleFileSelect(files)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!vendorInfo || !serviceId) return

    // Validation
    if (!formData.name.trim()) {
      alert('Nama service wajib diisi')
      return
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      alert('Harga harus lebih dari 0')
      return
    }

    setSubmitting(true)

    try {
      // Upload new images
      const newImageUrls = await uploadAllImages()
      
      // Check for upload errors
      const hasUploadErrors = uploadedImages.some(img => img.error)
      if (hasUploadErrors) {
        alert('Beberapa gambar gagal diupload. Silakan coba lagi.')
        setSubmitting(false)
        return
      }

      // Combine existing images (yang tidak dihapus) dengan new images
      const remainingExistingImages = existingImages.map(img => img.url)
      const allImageUrls = [...remainingExistingImages, ...newImageUrls]

      // Prepare update data
      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        duration: formData.duration ? parseInt(formData.duration) : null,
        service_type: formData.service_type,
        includes: formData.includes,
        excludes: formData.excludes,
        terms_conditions: formData.terms_conditions.trim() || null,
        cancellation_policy: formData.cancellation_policy.trim() || null,
        max_revisions: formData.max_revisions ? parseInt(formData.max_revisions) : null,
        delivery_time: formData.delivery_time ? parseInt(formData.delivery_time) : null,
        advance_booking_days: formData.advance_booking_days ? parseInt(formData.advance_booking_days) : 7,
        max_guests: formData.max_guests ? parseInt(formData.max_guests) : null,
        images: allImageUrls,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        updated_at: new Date().toISOString()
      }

      // Update service in database
      const { error } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', serviceId)
        .eq('vendor_id', vendorInfo.id)

      if (error) {
        console.error('Error updating service:', error)
        alert('Gagal memperbarui service. Silakan coba lagi.')
        return
      }

      // Delete old images from storage if any
      if (imagesToDelete.length > 0) {
        try {
          const filePaths = imagesToDelete.map(url => {
            const fileName = url.split('/').pop()
            return `services/${fileName}`
          })
          
          await supabase.storage
            .from('images')
            .remove(filePaths)
        } catch (deleteError) {
          console.error('Error deleting old images:', deleteError)
          // Don't block the success flow for delete errors
        }
      }

      alert('Service berhasil diperbarui!')
      router.push('/vendor/services')

    } catch (error) {
      console.error('Error:', error)
      alert('Terjadi kesalahan saat memperbarui service.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    if (originalData) {
      setFormData(originalData)
      setUploadedImages([])
      setExistingImages(originalData.images.map(url => ({ url, isExisting: true })))
      setImagesToDelete([])
    }
  }

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading service data...</p>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">Anda tidak memiliki akses untuk mengedit service ini.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Service</h1>
                <p className="text-gray-600 mt-2">
                  Perbarui informasi service Anda untuk {vendorInfo.business_name}
                </p>
              </div>
              <button
                onClick={() => router.push('/vendor/services')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Kembali ke Daftar Service
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Informasi Dasar</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Service *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: Wedding Photography Package"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga (Rp) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1000000"
                    min="0"
                    step="1000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durasi (jam)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipe Service
                  </label>
                  <select
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

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deskripsi
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jelaskan detail service yang ditawarkan..."
                />
              </div>

              {/* Status toggles */}
              <div className="mt-6 flex gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Service Aktif</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={formData.is_featured}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Featured Service</span>
                </label>
              </div>
            </div>

            {/* Include/Exclude Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Yang Termasuk & Tidak Termasuk</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Includes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yang Termasuk dalam Paket
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newInclude}
                      onChange={(e) => setNewInclude(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tambah item..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInclude())}
                    />
                    <button
                      type="button"
                      onClick={addInclude}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Tambah
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.includes.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-md">
                        <span className="text-sm text-green-800">✓ {item}</span>
                        <button
                          type="button"
                          onClick={() => removeInclude(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Excludes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yang Tidak Termasuk
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newExclude}
                      onChange={(e) => setNewExclude(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tambah item..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExclude())}
                    />
                    <button
                      type="button"
                      onClick={addExclude}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Tambah
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.excludes.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-red-50 px-3 py-2 rounded-md">
                        <span className="text-sm text-red-800">✗ {item}</span>
                        <button
                          type="button"
                          onClick={() => removeExclude(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Images Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Gambar Service</h2>
              
              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-700 mb-3">Gambar Saat Ini</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {existingImages.map((image, index) => (
                      <div key={index} className="relative">
                        <Image
                          src={image.url}
                          alt={`Existing ${index + 1}`}
                          width={128}
                          height={128}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(image.url)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload new images */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="text-gray-600">
                  <p className="text-lg font-medium">Tambah Gambar Baru</p>
                  <p className="text-sm">Drag & drop gambar di sini atau</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                    className="hidden"
                    id="imageUpload"
                  />
                  <label
                    htmlFor="imageUpload"
                    className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
                  >
                    Pilih Gambar
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Maksimal 5MB per file. Format: JPG, PNG, WEBP
                  </p>
                </div>
              </div>

              {/* Uploaded images preview */}
              {uploadedImages.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-md font-medium text-gray-700 mb-3">Gambar yang Akan Ditambahkan</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {uploadedImages.map((image, index) => (
                      <div key={index} className="relative">
                        <Image
                          src={image.preview}
                          alt={`Preview ${index + 1}`}
                          width={128}
                          height={128}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        {image.uploading && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                            <div className="text-white text-sm">Uploading...</div>
                          </div>
                        )}
                        {image.error && (
                          <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center rounded-lg">
                            <div className="text-white text-xs text-center p-2">{image.error}</div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeUploadedImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Additional Settings Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Pengaturan Tambahan</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maksimal Revisi
                  </label>
                  <input
                    type="number"
                    name="max_revisions"
                    value={formData.max_revisions}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Waktu Pengerjaan (hari)
                  </label>
                  <input
                    type="number"
                    name="delivery_time"
                    value={formData.delivery_time}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Minimal (hari)
                  </label>
                  <input
                    type="number"
                    name="advance_booking_days"
                    value={formData.advance_booking_days}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maksimal Tamu
                  </label>
                  <input
                    type="number"
                    name="max_guests"
                    value={formData.max_guests}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    placeholder="Tidak terbatas"
                  />
                </div>
              </div>
            </div>

            {/* Terms and Policies Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Syarat & Ketentuan</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Syarat & Ketentuan
                  </label>
                  <textarea
                    name="terms_conditions"
                    value={formData.terms_conditions}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tuliskan syarat dan ketentuan service..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kebijakan Pembatalan
                  </label>
                  <textarea
                    name="cancellation_policy"
                    value={formData.cancellation_policy}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tuliskan kebijakan pembatalan..."
                  />
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-between items-center pt-6">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Reset Form
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/vendor/services')}
                  className="px-6 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Batal
                </button>
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Menyimpan...' : 'Perbarui Service'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}