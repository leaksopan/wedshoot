'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface BookingCalendarProps {
  serviceId: string
  vendorId: string
  selectedDates: Date[]
  onDatesChange: (dates: Date[]) => void
}

interface AvailabilityData {
  date: string
  status: 'available' | 'booked' | 'blocked'
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  serviceId,
  vendorId,
  selectedDates,
  onDatesChange
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availability, setAvailability] = useState<AvailabilityData[]>([])
  const [bookedDates, setBookedDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAvailabilityData()
  }, [currentMonth, serviceId, vendorId])

  const loadAvailabilityData = async () => {
    try {
      setLoading(true)

      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      // Get vendor availability settings (blocked dates)
      const { data: availabilityData } = await supabase
        .from('availability')
        .select('date, status')
        .eq('vendor_id', vendorId)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])

      // Get existing confirmed bookings for this vendor (booked dates)
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('booking_dates')
        .eq('vendor_id', vendorId)
        .in('status', ['confirmed', 'completed'])

      // Flatten all booking dates from all confirmed bookings
      const allBookedDates: string[] = []
      if (bookingsData) {
        bookingsData.forEach(booking => {
          if (booking.booking_dates) {
            allBookedDates.push(...booking.booking_dates)
          }
        })
      }

      // Filter availability data to ensure proper types
      const filteredAvailability = (availabilityData || []).map(item => ({
        date: item.date,
        status: (item.status as 'available' | 'booked' | 'blocked') || 'available'
      }))

      setAvailability(filteredAvailability)
      setBookedDates(allBookedDates)
    } catch (error) {
      console.error('Error loading availability:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateStatus = (date: Date): 'available' | 'booked' | 'blocked' | 'selected' => {
    const dateString = date.toISOString().split('T')[0]
    
    // Check if date is selected
    if (selectedDates.some(d => d.toISOString().split('T')[0] === dateString)) {
      return 'selected'
    }

    // Check if date is booked by other users
    if (bookedDates.includes(dateString)) {
      return 'booked'
    }

    // Check vendor availability settings
    const availabilityRecord = availability.find(a => a.date === dateString)
    if (availabilityRecord) {
      return availabilityRecord.status
    }

    // Default to available if not in past
    if (date < new Date()) {
      return 'blocked'
    }

    return 'available'
  }

  const handleDateClick = (date: Date) => {
    const status = getDateStatus(date)
    
    // Only allow clicking on available dates or selected dates (to deselect)
    if (status === 'available' || status === 'selected') {
      const dateString = date.toISOString().split('T')[0]
      const isSelected = selectedDates.some(d => d.toISOString().split('T')[0] === dateString)
      
      if (isSelected) {
        // Remove date from selection
        const newDates = selectedDates.filter(d => d.toISOString().split('T')[0] !== dateString)
        onDatesChange(newDates)
      } else {
        // Add date to selection
        const newDates = [...selectedDates, date]
        onDatesChange(newDates.sort((a, b) => a.getTime() - b.getTime()))
      }
    }
  }

  const getDateClass = (status: string): string => {
    switch (status) {
      case 'selected':
        return 'bg-green-500 text-white font-semibold cursor-pointer hover:bg-green-600'
      case 'booked':
        return 'bg-red-500 text-white cursor-not-allowed'
      case 'blocked':
        return 'bg-gray-400 text-white cursor-not-allowed'
      case 'available':
        return 'bg-white border border-gray-300 hover:bg-blue-50 cursor-pointer'
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
    const lastDay = new Date(year, month + 1, 0)
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

  const calendarDays = generateCalendarDays()

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-100 rounded-full"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-sm font-semibold text-gray-900">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-100 rounded-full"
            aria-label="Next month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map(day => (
            <div key={day} className="p-1 text-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="p-3">
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <button
              key={index}
              onClick={() => day.isCurrentMonth && handleDateClick(day.date)}
              disabled={!day.isCurrentMonth || day.status === 'booked' || day.status === 'blocked'}
              className={`
                p-1 text-xs rounded transition-colors h-8 flex items-center justify-center
                ${!day.isCurrentMonth 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : getDateClass(day.status)
                }
              `}
              title={
                day.status === 'booked' ? 'Tanggal sudah dipesan' :
                day.status === 'blocked' ? 'Tanggal tidak tersedia' :
                day.status === 'selected' ? 'Tanggal terpilih (klik untuk batal)' :
                'Klik untuk memilih tanggal'
              }
            >
              {day.day}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded mr-1"></div>
              <span>Terpilih</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded mr-1"></div>
              <span>Dipesan</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-gray-400 rounded mr-1"></div>
              <span>Tidak tersedia</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-white border border-gray-300 rounded mr-1"></div>
              <span>Tersedia</span>
            </div>
          </div>
        </div>

        {/* Selected dates summary */}
        {selectedDates.length > 0 && (
          <div className="mt-3 p-2 bg-green-50 rounded">
            <div className="text-xs font-medium text-green-800 mb-1">
              Terpilih ({selectedDates.length}):
            </div>
            <div className="text-xs text-green-700">
              {selectedDates.map(date => 
                date.toLocaleDateString('id-ID', { 
                  day: 'numeric', 
                  month: 'short' 
                })
              ).join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingCalendar