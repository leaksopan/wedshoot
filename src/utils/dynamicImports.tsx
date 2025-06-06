// Dynamic imports untuk mengurangi initial bundle size
import React, { lazy } from 'react'

// Lazy load heavy components
export const LazyBookingCalendar = lazy(() => 
  import('@/components/BookingCalendar').then(module => ({
    default: module.default
  }))
)

export const LazyChatModal = lazy(() => 
  import('@/components/ChatModal').then(module => ({
    default: module.default
  }))
)

// Lazy load hooks yang berat
export const useChatLazy = () => 
  import('@/hooks/useChat').then(module => module.useChat)

// Preload functions untuk critical components
export const preloadBookingCalendar = () => {
  const componentImport = import('@/components/BookingCalendar')
  return componentImport
}

export const preloadChatModal = () => {
  const componentImport = import('@/components/ChatModal')
  return componentImport
}

// Utility untuk preload berdasarkan user interaction
export const preloadOnHover = (preloadFn: () => Promise<unknown>) => {
  let preloaded = false
  
  return () => {
    if (!preloaded) {
      preloaded = true
      preloadFn()
    }
  }
}

// Loading fallback components
export const BookingCalendarSkeleton: React.FC = () => (
  <div className="w-full bg-white rounded-lg border border-gray-200 p-6">
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

export const ChatModalSkeleton: React.FC = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <div className="bg-white rounded-xl w-full max-w-lg h-[600px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
    </div>
  </div>
) 