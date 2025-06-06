'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { Message } from '@/types/database'
import { debugRealtimeConnection, testRealtimeWithMessage } from '@/utils/debugRealtime'
import { performRealtimeHealthCheck, retryRealtimeConnection } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  
  const { isAuthenticated, user, profile, loading: authLoading } = useAuth()
  const { messages, loading: chatLoading, loadMessages, sendMessage, realtimeConnected } = useChat()
  
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [roomInfo, setRoomInfo] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')

  // Auth check dan load messages
  useEffect(() => {
    if (authLoading) return
    
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    if (roomId && isAuthenticated) {
      loadMessages(roomId)
    }
  }, [authLoading, isAuthenticated, roomId, loadMessages, router])

  // Monitor realtime connection status
  useEffect(() => {
    const checkConnectionStatus = () => {
      if (realtimeConnected) {
        setConnectionStatus('connected')
      } else if (error) {
        setConnectionStatus('error')
      } else {
        setConnectionStatus('disconnected')
      }
    }

    // Check status immediately
    checkConnectionStatus()

    // Periodic health check
    const interval = setInterval(checkConnectionStatus, 5000)

    return () => clearInterval(interval)
  }, [realtimeConnected, error])

  // Auto scroll ke bottom saat ada pesan baru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || sending) return

    setSending(true)
    try {
      const success = await sendMessage(roomId, messageText.trim())
      if (success) {
        setMessageText('')
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else {
        setError('Gagal mengirim pesan. Silakan coba lagi.')
      }
    } catch (error) {
      setError('Terjadi kesalahan saat mengirim pesan.')
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const formEvent = new Event('submit') as any
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
    
    const debug = debugRealtimeConnection()
    debug.checkConnectionStatus()
    debug.testBasicConnection()
    
    // Perform health check
    await performRealtimeHealthCheck()
    
    if (roomId) {
      const stopMonitor = debug.monitorMessagesTable(roomId)
      // Stop monitoring after 30 seconds
      setTimeout(stopMonitor, 30000)
    }
  }

  const handleTestRealtimeMessage = async () => {
    if (process.env.NODE_ENV !== 'development' || !user?.id) return
    
    await testRealtimeWithMessage(roomId, user.id)
  }

  const handleRetryConnection = async () => {
    if (process.env.NODE_ENV !== 'development') return
    
    setError('Mencoba menghubungkan ulang realtime...')
    setConnectionStatus('connecting')
    
    const success = await retryRealtimeConnection()
    
    if (success) {
      setError(null)
      setConnectionStatus('connected')
      // Reload messages after reconnection
      setTimeout(() => {
        loadMessages(roomId)
      }, 1000)
    } else {
      setError('Gagal menghubungkan ulang. Silakan refresh halaman.')
      setConnectionStatus('error')
    }
  }

  const handleNetworkDiagnostic = async () => {
    if (process.env.NODE_ENV !== 'development') return
    
    // Test basic fetch
    try {
      const response = await fetch('https://rufdjysbrykvrtxyqxtg.supabase.co/rest/v1/', {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        }
      })
      console.log('✅ REST API accessible:', response.status)
    } catch (error) {
      console.error('❌ REST API not accessible:', error)
    }
    
    // Test WebSocket connectivity
    try {
      const wsTest = new WebSocket('wss://rufdjysbrykvrtxyqxtg.supabase.co/realtime/v1/websocket?apikey=' + 
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '') + '&vsn=1.0.0')
      
      wsTest.onopen = () => {
        console.log('✅ WebSocket connection successful')
        wsTest.close()
      }
      
      wsTest.onerror = (error) => {
        console.error('❌ WebSocket connection failed:', error)
      }
      
      wsTest.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason)
      }
      
    } catch (error) {
      console.error('❌ WebSocket test failed:', error)
    }
    
    // Test auth
    const { data: authData, error: authError } = await supabase.auth.getSession()
    if (authError) {
      console.error('❌ Auth issue:', authError)
    } else {
      console.log('✅ Auth working:', !!authData.session)
    }
  }

  // Loading state
  if (authLoading || (!isAuthenticated && authLoading)) {
    return (
      <AppLayout>
        <div className="h-[calc(100vh-80px)] flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat chat...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Error state
  if (error) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Reload Halaman
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Main chat interface
  return (
    <AppLayout>
      <div className="h-[calc(100vh-80px)] flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center">
          <Link
            href="/chat"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-4"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {roomInfo?.partner_name?.charAt(0) || 'C'}
              </span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">
                {roomInfo?.partner_name || 'Chat'}
              </h1>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                <p className="text-sm text-gray-500">
                  {connectionStatus === 'connected' ? 'Realtime Aktif' :
                   connectionStatus === 'connecting' ? 'Menghubungkan...' :
                   connectionStatus === 'error' ? 'Error Koneksi' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Debug buttons (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="flex space-x-2">
              <button
                onClick={handleDebugRealtime}
                className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
              >
                Debug RT
              </button>
              <button
                onClick={handleTestRealtimeMessage}
                className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
              >
                Test RT
              </button>
              <button
                onClick={handleRetryConnection}
                className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
              >
                Retry RT
              </button>
              <button
                onClick={handleNetworkDiagnostic}
                className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors"
              >
                Network
              </button>
            </div>
          )}
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Error Display */}
          {error && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-red-800">Connection Issue</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="flex-shrink-0 bg-red-100 hover:bg-red-200 rounded-lg p-1 transition-colors"
              >
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {chatLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-center">Belum ada pesan</p>
              <p className="text-sm text-center mt-2">Mulai percakapan dengan mengirim pesan</p>
            </div>
          ) : (
            messages.map((message: Message) => {
              const isMyMessage = message.sender_id === user?.id
              
              return (
                <div key={message.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[70%]">
                    {!isMyMessage && (
                      <p className="text-xs text-gray-500 mb-1 px-3">
                        {message.sender?.full_name || 'Unknown'}
                      </p>
                    )}
                    
                    <div className={`rounded-2xl px-4 py-3 ${
                      isMyMessage 
                        ? 'bg-red-500 text-white' 
                        : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                    }`}>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      
                      <div className={`flex items-center justify-between mt-2 text-xs ${
                        isMyMessage ? 'text-red-200' : 'text-gray-500'
                      }`}>
                        <span>{formatTime(message.created_at)}</span>
                        {isMyMessage && (
                          <div className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {message.read_at && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <form onSubmit={handleSendMessage}>
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ketik pesan..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                  disabled={sending}
                />
              </div>

              <button
                type="submit"
                disabled={!messageText.trim() || sending}
                className={`p-3 rounded-xl transition-colors ${
                  messageText.trim() && !sending
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
} 