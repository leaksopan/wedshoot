'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { ChatRoom } from '@/types/database'
import { clearSnapmeSessions, resetApplication, debugStorageKeys, forceFixStuckSession } from '@/utils/sessionUtils'

export default function ChatListPage() {
  const router = useRouter()
  const { isAuthenticated, user, profile, loading: authLoading, signOut } = useAuth()
  const { chatRooms, loading, loadChatRooms, realtimeConnected, cleanupConnections, getOrCreateChatRoom } = useChat()
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasLoadedRooms, setHasLoadedRooms] = useState(false)
  const [processingVendorChat, setProcessingVendorChat] = useState(false)
  
  // Refs untuk prevent dependency loops
  const userIdRef = useRef<string | null>(null)
  const isAuthenticatedRef = useRef<boolean>(false)
  const isInitializedRef = useRef<boolean>(false)
  const loadingInitiatedRef = useRef<boolean>(false)
  
  // Update refs ketika values berubah
  useEffect(() => {
    userIdRef.current = user?.id || null
    isAuthenticatedRef.current = isAuthenticated
    isInitializedRef.current = isInitialized
  }, [user?.id, isAuthenticated, isInitialized])

  // Memoize stable values
  const userId = useMemo(() => user?.id || null, [user?.id])
  const hasUser = useMemo(() => !!user, [user])

  // Load chat rooms dengan debounce
  const handleLoadChatRooms = useCallback(async () => {
    if (!isAuthenticated || !hasUser || loadingInitiatedRef.current || hasLoadedRooms) {
      console.log('🚫 Skipping chat rooms load:', { 
        isAuthenticated, 
        hasUser, 
        loadingInitiated: loadingInitiatedRef.current,
        hasLoadedRooms 
      })
      return
    }

    loadingInitiatedRef.current = true
    console.log('🔄 Loading chat rooms...')
    
    try {
      await loadChatRooms()
      setHasLoadedRooms(true)
    } catch (error) {
      console.error('❌ Error loading chat rooms:', error)
    } finally {
      loadingInitiatedRef.current = false
    }
  }, [isAuthenticated, hasUser, loadChatRooms, hasLoadedRooms])

  // Handle pending vendor chat dari sessionStorage
  const handlePendingVendorChat = useCallback(async () => {
    if (!isAuthenticated || !user?.id || processingVendorChat) return

    const pendingVendorData = sessionStorage.getItem('pendingVendorChat')
    if (!pendingVendorData) return

    try {
      setProcessingVendorChat(true)
      const vendorInfo = JSON.parse(pendingVendorData)
      
      console.log('🎯 Processing pending vendor chat:', vendorInfo)
      
      // Clear dari sessionStorage
      sessionStorage.removeItem('pendingVendorChat')
      
      // Gunakan vendor.id untuk create/get chat room
      const roomId = await getOrCreateChatRoom(vendorInfo.id)
      
      if (roomId) {
        // Redirect ke chat room
        router.push(`/chat/${roomId}`)
      }
    } catch (error) {
      console.error('❌ Error processing pending vendor chat:', error)
      // Clear invalid data
      sessionStorage.removeItem('pendingVendorChat')
    } finally {
      setProcessingVendorChat(false)
    }
  }, [isAuthenticated, user?.id, processingVendorChat, getOrCreateChatRoom, router])

  useEffect(() => {
    // Clear old snapme sessions on page load
    clearSnapmeSessions()
    
    // Tunggu auth loading selesai dulu
    if (authLoading) return
    
    // Reset initialization state jika auth berubah
    if (!isInitialized) {
      setIsInitialized(true)
    }
    
    if (!isAuthenticated) {
      // Reset states ketika logout
      setHasLoadedRooms(false)
      loadingInitiatedRef.current = false
      // Clean up connections sebelum redirect
      cleanupConnections?.()
      router.push('/login')
      return
    }

    // Load chat rooms hanya sekali setelah authenticated
    if (isAuthenticated && hasUser && isInitialized && !hasLoadedRooms && !loading) {
      const timeoutId = setTimeout(() => {
        handleLoadChatRooms()
        // Check for pending vendor chat setelah load rooms
        handlePendingVendorChat()
      }, 1000) // Delay untuk stabilitas
      
      return () => clearTimeout(timeoutId)
    }

    // Cleanup function
    return () => {
      if (!isAuthenticated) {
        cleanupConnections?.()
      }
    }
  }, [authLoading, isAuthenticated, userId, isInitialized, hasLoadedRooms, loading, hasUser, router, cleanupConnections, handleLoadChatRooms, handlePendingVendorChat])

  // Reset loaded state when user changes
  useEffect(() => {
    const currentUserId = user?.id
    if (userIdRef.current !== currentUserId) {
      setHasLoadedRooms(false)
      loadingInitiatedRef.current = false
      setIsInitialized(false)
    }
  }, [user?.id])

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleChatClick = (room: ChatRoom) => {
    router.push(`/chat/${room.id}`)
  }

  // Debug functions (development only)
  const handleDebugAuth = () => {
    if (process.env.NODE_ENV !== 'development') return
    
    const info = {
      authLoading,
      isAuthenticated,
      user: user ? { id: user.id, email: user.email } : null,
      profile: profile ? { is_vendor: profile.is_vendor, full_name: profile.full_name } : null,
      chatRoomsCount: chatRooms.length,
      realtimeConnected,
      hasLoadedRooms,
      loadingInitiated: loadingInitiatedRef.current,
      localStorage: debugStorageKeys()
    }
    setDebugInfo(info)
    console.log('Debug Auth Info:', info)
  }

  const handleForceReset = async () => {
    if (process.env.NODE_ENV !== 'development') return
    
    await resetApplication()
    window.location.reload()
  }

  const handleForceSignOut = async () => {
    try {
      cleanupConnections?.()
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Force signout error:', error)
      await forceFixStuckSession()
      window.location.href = '/login'
    }
  }

  const handleFixStuckSession = async () => {
    if (process.env.NODE_ENV !== 'development') return
    
    await forceFixStuckSession()
    window.location.reload()
  }

  const handleReloadRooms = () => {
    if (process.env.NODE_ENV !== 'development') return
    
    setHasLoadedRooms(false)
    loadingInitiatedRef.current = false
    handleLoadChatRooms()
  }

  if (authLoading || processingVendorChat) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {authLoading ? 'Loading...' : 'Memulai chat dengan vendor...'}
            </p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
            <p className="text-gray-600 mt-1">Percakapan dengan vendor</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${realtimeConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-500">
              {realtimeConnected ? 'Terhubung' : 'Terputus'}
            </span>
          </div>
        </div>

        {/* Debug Panel (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">Debug Panel</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={handleDebugAuth}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Debug Auth
              </button>
              <button
                onClick={handleForceSignOut}
                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
              >
                Force SignOut
              </button>
              <button
                onClick={handleForceReset}
                className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Reset App
              </button>
              <button
                onClick={handleFixStuckSession}
                className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Fix Stuck Session
              </button>
              <button
                onClick={handleReloadRooms}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
              >
                Reload Rooms
              </button>
            </div>
            {debugInfo && (
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Chat Rooms List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {(loading && !hasLoadedRooms) ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Memuat chat rooms...</p>
              </div>
            </div>
          ) : chatRooms.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada percakapan</h3>
              <p className="text-gray-500">Mulai chat dengan vendor melalui halaman vendor</p>
              <Link
                href="/vendors"
                className="mt-4 inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Cari Vendor
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {chatRooms.map((room) => {
                const isVendor = profile?.is_vendor
                const displayName = isVendor 
                  ? (room.client?.full_name || 'Client')
                  : (room.vendor?.business_name || room.vendor?.user_profiles?.full_name || 'Vendor')
                
                return (
                  <button
                    key={room.id}
                    onClick={() => handleChatClick(room)}
                    className="w-full text-left p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {displayName}
                          </h3>
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {room.last_message_preview || 'Belum ada pesan'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          {room.last_message_at ? formatTime(room.last_message_at) : ''}
                        </div>
                        {((isVendor && room.unread_count_vendor > 0) || 
                          (!isVendor && room.unread_count_client > 0)) && (
                          <div className="mt-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center ml-auto">
                            {isVendor ? room.unread_count_vendor : room.unread_count_client}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
} 