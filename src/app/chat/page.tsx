'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { ChatRoom } from '@/types/database'
import { clearSnapmeSessions, resetApplication, debugStorageKeys } from '@/utils/sessionUtils'

export default function ChatListPage() {
  const router = useRouter()
  const { isAuthenticated, user, profile, loading: authLoading } = useAuth()
  const { chatRooms, loading, loadChatRooms, realtimeConnected } = useChat()
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    // Clear old snapme sessions on page load
    clearSnapmeSessions()
    
    // Tunggu auth loading selesai dulu
    if (authLoading) return
    
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    loadChatRooms()
  }, [authLoading, isAuthenticated, router]) // Hapus loadChatRooms dari dependencies

  // Debug function (hanya di development)
  const showDebugInfo = () => {
    if (process.env.NODE_ENV !== 'development') return

    const info = {
      auth: {
        isAuthenticated,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        hasProfile: !!profile,
        preferredRole: profile?.preferred_role
      },
      storage: typeof window !== 'undefined' ? {
        localStorage: Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('auth') || key.includes('snapme') || key.includes('wedshoot')
        ),
        sessionStorage: Object.keys(sessionStorage).filter(key => 
          key.includes('supabase') || key.includes('auth') || key.includes('snapme') || key.includes('wedshoot')
        )
      } : null
    }
    setDebugInfo(info)
  }

  const formatLastMessageTime = (timestamp: string | null) => {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Baru saja'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}j`
    if (diffDays === 1) return 'Kemarin'
    if (diffDays < 7) return `${diffDays}h`
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    })
  }

  const getChatPartner = (room: ChatRoom) => {
    if (profile?.is_vendor) {
      // Jika saya vendor, tampilkan client
      return {
        name: room.client?.full_name || 'Client',
        avatar: room.client?.avatar_url,
        id: room.client?.id
      }
    } else {
      // Jika saya client, tampilkan vendor
      return {
        name: room.vendor?.business_name || 'Vendor',
        avatar: room.vendor?.user_profiles?.avatar_url,
        id: room.vendor?.id
      }
    }
  }

  const getUnreadCount = (room: ChatRoom) => {
    return profile?.is_vendor ? room.unread_count_vendor : room.unread_count_client
  }

  // Show loading state
  if (authLoading || (!isAuthenticated && authLoading)) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Memuat daftar chat...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold text-gray-900">Pesan</h1>
                {/* Realtime Status Indicator */}
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
                  realtimeConnected 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    realtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`}></div>
                  <span>{realtimeConnected ? 'Realtime Aktif' : 'Offline'}</span>
                </div>
              </div>
              <p className="text-gray-600 mt-2">
                Kelola percakapan dengan {profile?.is_vendor ? 'klien' : 'vendor'} Anda
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Cari percakapan..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent w-80"
                />
              </div>
              
              {/* Debug Button (development only) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="flex space-x-2">
                  <button
                    onClick={showDebugInfo}
                    className="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Debug
                  </button>
                  <button
                    onClick={debugStorageKeys}
                    className="px-3 py-2 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    Storage
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Reset semua data browser? Ini akan logout dan reload halaman.')) {
                        resetApplication()
                      }
                    }}
                    className="px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-yellow-800">Debug Info</h3>
              <button
                onClick={() => setDebugInfo(null)}
                className="text-yellow-600 hover:text-yellow-800"
              >
                ✕
              </button>
            </div>
            <pre className="text-xs text-yellow-700 overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        {/* Chat List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : chatRooms.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada percakapan</h3>
              <p className="text-gray-500 mb-6">
                {profile?.is_vendor 
                  ? 'Klien akan menghubungi Anda melalui halaman layanan'
                  : 'Mulai chat dengan vendor dari halaman layanan'
                }
              </p>
              <Link
                href="/services"
                className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Jelajahi Layanan
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {chatRooms.map((room) => {
                const partner = getChatPartner(room)
                const unreadCount = getUnreadCount(room)
                
                return (
                  <Link
                    key={room.id}
                    href={`/chat/${room.id}`}
                    className="block hover:bg-gray-50 transition-colors"
                  >
                    <div className="px-6 py-4">
                      <div className="flex items-center space-x-4">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {partner.avatar ? (
                            <Image
                              src={partner.avatar}
                              alt={partner.name}
                              width={48}
                              height={48}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-lg">
                                {partner.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          
                          {/* Online indicator (placeholder) */}
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                        </div>

                        {/* Chat Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className={`text-sm font-medium truncate ${
                              unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {partner.name}
                            </h3>
                            <div className="flex items-center space-x-2">
                              {room.last_message_at && (
                                <span className="text-xs text-gray-500">
                                  {formatLastMessageTime(room.last_message_at)}
                                </span>
                              )}
                              {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                  {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Last Message Preview */}
                          <p className={`text-sm truncate ${
                            unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                          }`}>
                            {room.last_message_preview || 'Mulai percakapan...'}
                          </p>
                        </div>

                        {/* Chevron */}
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {chatRooms.length > 0 && (
          <div className="mt-8">
            <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Tips Chat Efektif</h3>
                  <p className="text-red-700 text-sm mt-1">
                    {profile?.is_vendor 
                      ? 'Respon cepat meningkatkan kepuasan klien dan rating Anda'
                      : 'Tanyakan detail spesifik untuk mendapatkan penawaran terbaik'
                    }
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Link
                    href="/services"
                    className="px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                  >
                    Jelajahi Layanan
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
} 