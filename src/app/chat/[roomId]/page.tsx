'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { Message } from '@/types/database'
import { supabase, performRealtimeHealthCheck, retryRealtimeConnection } from '@/lib/supabase'
import { debugRealtimeConnection, testRealtimeWithMessage } from '@/utils/debugRealtime'

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
  
  // Refs untuk prevent dependency loops
  const userIdRef = useRef<string | null>(null)
  const roomIdRef = useRef<string>(roomId)
  const isAuthenticatedRef = useRef<boolean>(false)
  
  // Update refs ketika values berubah
  useEffect(() => {
    userIdRef.current = user?.id || null
    roomIdRef.current = roomId
    isAuthenticatedRef.current = isAuthenticated
  }, [user?.id, roomId, isAuthenticated])

  // Memoize stable values
  const stableRoomId = useMemo(() => roomId, [roomId])
  const userId = useMemo(() => user?.id || null, [user?.id])

  // Auth check dan load messages - OPTIMIZED
  useEffect(() => {
    console.log('🎯 Chat page effect triggered:', { authLoading, isAuthenticated, roomId })
    if (authLoading) return
    
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Only load messages once when conditions are met
    if (roomId && isAuthenticated && userId) {
      console.log('📞 Calling loadMessages with roomId:', roomId)
      const timeoutId = setTimeout(() => {
        loadMessages(roomId)
      }, 100) // Small delay to prevent rapid calls
      
      return () => clearTimeout(timeoutId)
    }
  }, [authLoading, isAuthenticated, stableRoomId, userId, router]) // Remove loadMessages dependency

  // Monitor realtime connection status
  useEffect(() => {
    const checkConnectionStatus = () => {
      if (realtimeConnected) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('disconnected')
      }
    }

    // Check status immediately
    checkConnectionStatus()

    // Periodic health check
    const interval = setInterval(checkConnectionStatus, 5000)

    return () => clearInterval(interval)
  }, [realtimeConnected])

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
      }
    } catch {
      // Error handled silently
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
    
    setConnectionStatus('connecting')
    
    const success = await retryRealtimeConnection()
    
    if (success) {
      setConnectionStatus('connected')
      // Reload messages after reconnection
      setTimeout(() => {
        loadMessages(roomId)
      }, 1000)
    } else {
      setConnectionStatus('error')
    }
  }

  const handleNetworkDiagnostic = async () => {
    if (process.env.NODE_ENV !== 'development') return
    
    // Test basic fetch
    try {
      await fetch('https://rufdjysbrykvrtxyqxtg.supabase.co/rest/v1/', {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        }
      })
      // Response logged in development only
    } catch {
      // Error handled silently
    }
    
    // Test WebSocket connectivity
    try {
      const wsTest = new WebSocket('wss://rufdjysbrykvrtxyqxtg.supabase.co/realtime/v1/websocket?apikey=' + 
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '') + '&vsn=1.0.0')
      
      wsTest.onopen = () => {
        wsTest.close()
      }
      
      wsTest.onerror = () => {
        // Error handled silently
      }
      
      wsTest.onclose = () => {
        // Close handled silently
      }
      
    } catch {
      // Error handled silently
    }
    
    // Test auth
    await supabase.auth.getSession()
    // Auth data available in development only
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

  return (
    <AppLayout>
      <div className="h-[calc(100vh-80px)] flex flex-col bg-gray-50">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/chat"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">V</span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Chat Room</h1>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-500' :
                      connectionStatus === 'connecting' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-gray-500">
                      {connectionStatus === 'connected' ? 'Online' :
                       connectionStatus === 'connecting' ? 'Connecting...' :
                       'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Debug Controls (development only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDebugRealtime}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Debug RT
                </button>
                <button
                  onClick={handleTestRealtimeMessage}
                  className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                >
                  Test Msg
                </button>
                <button
                  onClick={handleRetryConnection}
                  className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
                >
                  Retry
                </button>
                <button
                  onClick={handleNetworkDiagnostic}
                  className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600"
                >
                  Network
                </button> 
              </div>
            )}
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {(() => {
            console.log('🖼️ Render state:', { chatLoading, messagesLength: messages.length, messages: messages.slice(0, 3) })
            return null
          })()}
          {chatLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-500">Belum ada pesan. Mulai percakapan!</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message: Message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_id === user?.id
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-900 border'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender_id === user?.id ? 'text-red-100' : 'text-gray-500'
                    }`}>
                      {formatTime(message.created_at)}
                      {message.sender_id === user?.id && message.read_at && (
                        <span className="ml-2">✓✓</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
            <div className="flex-1">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ketik pesan..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={1}
                disabled={sending}
              />
            </div>
            <button
              type="submit"
              disabled={!messageText.trim() || sending}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  )
} 