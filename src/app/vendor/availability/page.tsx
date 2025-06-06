'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/hooks/useAuth'

interface AvailabilityRecord {
  id: string
  date: string
  status: 'available' | 'booked' | 'blocked' | null
  notes?: string | null
  booking_type?: string | null
  created_at?: string | null
  updated_at?: string | null
  vendor_id: string
  time_slots?: Record<string, unknown> | null
}

export default function VendorAvailabilityPage() {
  const { isAuthenticated, user, profile } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availability, setAvailability] = useState<AvailabilityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [vendorId, setVendorId] = useState<string | null>(null)

  const loadVendorData = useCallback(async () => {
    if (!user) return

    try {
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (vendorData) {
        setVendorId(vendorData.id)
      }
    } catch (error) {
      console.error('Error loading vendor data:', error)
    }
  }, [user])

  const loadAvailabilityData = useCallback(async () => {
    if (!vendorId) return

    try {
      setLoading(true)

      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      const { data: availabilityData } = await supabase
        .from('availability')
        .select('*')
        .eq('vendor_id', vendorId)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])

      setAvailability((availabilityData || []) as AvailabilityRecord[])
    } catch (error) {
      console.error('Error loading availability:', error)
    } finally {
      setLoading(false)
    }
  }, [vendorId, currentMonth])

  useEffect(() => {
    if (isAuthenticated && profile) {
      loadVendorData()
    }
  }, [isAuthenticated, profile, loadVendorData])

  useEffect(() => {
    if (vendorId) {
      loadAvailabilityData()
    }
  }, [currentMonth, vendorId, loadAvailabilityData])

  const getDateStatus = (date: Date): 'available' | 'booked' | 'blocked' => {
    const dateString = date.toISOString().split('T')[0]
    const record = availability.find(a => a.date === dateString)
    
    if (record && record.status) {
      return record.status as 'available' | 'booked' | 'blocked'
    }
    
    // Default to available for future dates
    return date >= new Date() ? 'available' : 'blocked'
  }

  const handleDateClick = async (date: Date) => {
    if (!vendorId) return
    
    const dateString = date.toISOString().split('T')[0]
    const currentStatus = getDateStatus(date)
    
    // Toggle status: available -> blocked -> available
    const newStatus = currentStatus === 'available' ? 'blocked' : 'available'
    
    try {
      const existingRecord = availability.find(a => a.date === dateString)
      
      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('availability')
          .update({ status: newStatus })
          .eq('id', existingRecord.id)
          
        if (error) {
          console.error('Error updating availability:', error)
          return
        }
        
        // Update local state
        setAvailability(prev => 
          prev.map(a => a.id === existingRecord.id ? { ...a, status: newStatus } : a)
        )
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('availability')
          .insert({
            vendor_id: vendorId,
            date: dateString,
            status: newStatus
          })
          .select()
          .single()
          
        if (error) {
          console.error('Error creating availability:', error)
          return
        }
        
        if (data) {
          setAvailability(prev => [...prev, data as AvailabilityRecord])
        }
      }
    } catch (error) {
      console.error('Error updating availability:', error)
    }
  }

  const getDateClass = (status: string): string => {
    switch (status) {
      case 'booked':
        return 'bg-red-500 text-white cursor-not-allowed'
      case 'blocked':
        return 'bg-gray-400 text-white cursor-pointer hover:bg-gray-500'
      case 'available':
        return 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
      default:
        return 'bg-gray-100 text-gray-400 cursor-not-allowed'
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDay = new Date(year, month, 1)
    new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const currentDate = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      const isCurrentMonth = currentDate.getMonth() === month
      const status = isCurrentMonth ? getDateStatus(currentDate) : 'disabled'
      
      days.push({
        date: new Date(currentDate),
        isCurrentMonth,
        status,
        day: currentDate.getDate()
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return days
  }

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  if (!isAuthenticated || profile?.preferred_role !== 'vendor') {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">This page is only accessible to vendors.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  const calendarDays = generateCalendarDays()

  return (
    <AppLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Kelola Ketersediaan</h1>
            <p className="text-gray-600">
              Atur tanggal-tanggal Anda tersedia atau tidak tersedia untuk booking
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-gray-100 rounded-full"
                  aria-label="Previous month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <h2 className="text-xl font-semibold text-gray-900">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h2>
                
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-gray-100 rounded-full"
                  aria-label="Next month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2">
                {dayNames.map(day => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar grid */}
            <div className="p-6">
              {loading ? (
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 42 }).map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => day.isCurrentMonth && day.status !== 'booked' && handleDateClick(day.date)}
                      disabled={!day.isCurrentMonth || day.status === 'booked'}
                      className={`
                        p-3 text-sm rounded transition-colors h-12 flex items-center justify-center
                        ${!day.isCurrentMonth 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : getDateClass(day.status)
                        }
                      `}
                      title={
                        day.status === 'booked' ? 'Tanggal sudah ada booking' :
                        day.status === 'blocked' ? 'Tanggal tidak tersedia (klik untuk aktifkan)' :
                        'Tanggal tersedia (klik untuk nonaktifkan)'
                      }
                    >
                      {day.day}
                    </button>
                  ))}
                </div>
              )}

              {/* Legend */}
              <div className="mt-6 border-t pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Keterangan:</h3>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                    <span>Tersedia (klik untuk nonaktifkan)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-400 rounded mr-2"></div>
                    <span>Tidak tersedia (klik untuk aktifkan)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                    <span>Sudah ada booking</span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Cara Menggunakan:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Klik tanggal hijau untuk menonaktifkan (membuat tidak tersedia)</li>
                  <li>• Klik tanggal abu-abu untuk mengaktifkan (membuat tersedia)</li>
                  <li>• Tanggal merah adalah tanggal yang sudah ada booking dan tidak bisa diubah</li>
                  <li>• Perubahan akan tersimpan otomatis</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
} 