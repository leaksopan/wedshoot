'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { supabase, performRealtimeHealthCheck, retryRealtimeConnection } from '@/lib/supabase'

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const { messages, loading: chatLoading, loadMessages, sendMessage, realtimeConnected } = useChat()
  
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [isMessagesLoaded, setIsMessagesLoaded] = useState(false)
  
  // Refs untuk prevent dependency loops
  const userIdRef = useRef<string | null>(null)
  const roomIdRef = useRef<string>(roomId)
  const isAuthenticatedRef = useRef<boolean>(false)
  const loadedRoomIdRef = useRef<string | null>(null)
  
  // Update refs ketika values berubah
  useEffect(() => {
    userIdRef.current = user?.id || null
    roomIdRef.current = roomId
    isAuthenticatedRef.current = isAuthenticated
  }, [user?.id, roomId, isAuthenticated])

  // Memoize stable values
  const stableRoomId = useMemo(() => roomId, [roomId])
  const userId = useMemo(() => user?.id || null, [user?.id])

  // Load messages function dengan debounce
  const handleLoadMessages = useCallback(async (targetRoomId: string) => {
    if (!userId || !targetRoomId) return
    
    // Prevent duplicate loads
    if (loadedRoomIdRef.current === targetRoomId && isMessagesLoaded) {
      console.log('📋 Messages already loaded for room:', targetRoomId)
      return
    }
    
    console.log('📞 Loading messages for room:', targetRoomId)
    loadedRoomIdRef.current = targetRoomId
    
    try {
      await loadMessages(targetRoomId)
      setIsMessagesLoaded(true)
    } catch (error) {
      console.error('❌ Error loading messages:', error)
      setIsMessagesLoaded(false)
    }
  }, [userId, loadMessages, isMessagesLoaded])

  // Auth check dan load messages - OPTIMIZED
  useEffect(() => {
    console.log('🎯 Chat page effect triggered:', { authLoading, isAuthenticated, roomId, userId })
    
    if (authLoading) return
    
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Only load messages once when conditions are met
    if (roomId && isAuthenticated && userId && !isMessagesLoaded) {
      const timeoutId = setTimeout(() => {
        handleLoadMessages(roomId)
      }, 500) // Small delay to prevent rapid calls
      
      return () => clearTimeout(timeoutId)
    }
  }, [authLoading, isAuthenticated, stableRoomId, userId, isMessagesLoaded, router, handleLoadMessages, roomId])

  // Reset loaded state when room changes
  useEffect(() => {
    if (loadedRoomIdRef.current !== roomId) {
      setIsMessagesLoaded(false)
      loadedRoomIdRef.current = null
    }
  }, [roomId])

  // Monitor realtime connection status
  useEffect(() => {
    const checkConnectionStatus = () => {
      if (realtimeConnected) {
        setConnectionStatus('connected')
      } else if (chatLoading) {
        setConnectionStatus('connecting')
      } else {
        setConnectionStatus('disconnected')
      }
    }

    // Check status immediately
    checkConnectionStatus()

    // Periodic health check
    const interval = setInterval(checkConnectionStatus, 5000)

    return () => clearInterval(interval)
  }, [realtimeConnected, chatLoading])

  // Auto scroll ke bottom saat ada pesan baru
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [messages.length])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || sending || !userId) return

    setSending(true)
    try {
      const success = await sendMessage(roomId, messageText.trim())
      if (success) {
        setMessageText('')
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const formEvent = new Event('submit') as unknown as React.FormEvent
      handleSendMessage(formEvent)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Debug functions (development only)
  const handleDebugRealtime = async () => {
    if (process.env.NODE_ENV !== 'development') return
    
    console.log('🔍 Running realtime debug...')
    
    // Basic connection test
    const isConnected = supabase.realtime?.isConnected()
    console.log('📡 Realtime connected:', isConnected)
    
    // Channel status
    const channels = supabase.getChannels()
    console.log('📺 Active channels:', channels.length)
    channels.forEach(ch => {
      console.log(`  - ${ch.topic}: ${ch.state}`)
    })
    
    // Perform health check
    await performRealtimeHealthCheck()
  }

  const handleRetryConnection = async () => {
    if (process.env.NODE_ENV !== 'development') return
    
    setConnectionStatus('connecting')
    
    console.log('🔄 Manually retrying connection...')
    const success = await retryRealtimeConnection()
    
    if (success) {
      setConnectionStatus('connected')
      // Reload messages after reconnection
      setTimeout(() => {
        setIsMessagesLoaded(false)
        handleLoadMessages(roomId)
      }, 1000)
    } else {
      setConnectionStatus('error')
    }
  }

  const handleNetworkDiagnostic = async () => {
    if (process.env.NODE_ENV !== 'development') return
    
    console.log('🌐 Running network diagnostic...')
    
    // Test basic fetch
    try {
      const response = await fetch('https://rufdjysbrykvrtxyqxtg.supabase.co/rest/v1/', {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        }
      })
      console.log('✅ REST API test:', response.status)
    } catch (error) {
      console.error('❌ REST API test failed:', error)
    }
    
    // Test auth
    try {
      const { data: session } = await supabase.auth.getSession()
      console.log('🔐 Auth session:', !!session.session)
    } catch (error) {
      console.error('❌ Auth test failed:', error)
    }
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'disconnected': return 'bg-red-500'
      case 'error': return 'bg-red-600'
      default: return 'bg-gray-500'
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Terhubung'
      case 'connecting': return 'Menghubungkan...'
      case 'disconnected': return 'Terputus'
      case 'error': return 'Error'
      default: return 'Unknown'
    }
  }

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link
              href="/chat"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Chat Room</h1>
              <p className="text-sm text-gray-500">Room ID: {roomId}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`}></div>
            <span className="text-sm text-gray-500">{getConnectionStatusText()}</span>
          </div>
        </div>

        {/* Debug Panel (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2 text-sm">Debug Panel</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleDebugRealtime}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Debug Realtime
              </button>
              <button
                onClick={handleRetryConnection}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
              >
                Retry Connection
              </button>
              <button
                onClick={handleNetworkDiagnostic}
                className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Network Test
              </button>
              <button
                onClick={() => {
                  setIsMessagesLoaded(false)
                  handleLoadMessages(roomId)
                }}
                className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Reload Messages
              </button>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          {chatLoading && !isMessagesLoaded ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : (
            <>
              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>Belum ada pesan. Mulai percakapan!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.sender_id === userId
                    const senderName = message.sender?.full_name || 'Unknown'
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isOwnMessage
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {!isOwnMessage && (
                            <p className="text-xs font-semibold mb-1 opacity-70">
                              {senderName}
                            </p>
                          )}
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwnMessage ? 'text-red-100' : 'text-gray-500'
                            }`}
                          >
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 p-4">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ketik pesan..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={sending || !realtimeConnected}
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageText.trim() || !realtimeConnected}
                    className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? 'Mengirim...' : 'Kirim'}
                  </button>
                </form>
                {!realtimeConnected && (
                  <p className="text-xs text-red-500 mt-2">
                    Koneksi realtime terputus. Pesan mungkin tidak terkirim.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
} 