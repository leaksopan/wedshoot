'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, subscribeToMessages } from '@/lib/supabase'
import { ChatRoom, Message } from '@/types/database'
import { useAuth } from './useAuth'

export const useChat = () => {
  const { user, profile, isAuthenticated, sessionId } = useAuth()
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  
  // Refs untuk prevent dependency loops dan track state
  const initializationRef = useRef(false)
  const lastSessionIdRef = useRef<string | null>(null)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const realtimeChannelsRef = useRef<Map<string, RealtimeChannel>>(new Map())
  const cleanupFunctionsRef = useRef<(() => void)[]>([])
  const connectionRetryRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageCountRef = useRef<number>(0)

  // Clear loading timeout
  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }
  }, [])

  // Clear connection retry timeout
  const clearConnectionRetry = useCallback(() => {
    if (connectionRetryRef.current) {
      clearTimeout(connectionRetryRef.current)
      connectionRetryRef.current = null
    }
  }, [])

  // Memoize user info untuk stabilitas
  const userInfo = useMemo(() => {
    if (!user || !profile) return null
    
    return {
      id: user.id,
      isVendor: profile.is_vendor || false,
      fullName: profile.full_name || null,
      avatarUrl: profile.avatar_url || null,
      sessionId: sessionId || null
    }
  }, [user, profile, sessionId])

  // Cleanup all connections
  const cleanupConnections = useCallback(() => {
    console.log('🧹 Cleaning up chat connections...')
    
    clearLoadingTimeout()
    clearConnectionRetry()
    
    // Clear realtime channels dengan proper unsubscribe
    realtimeChannelsRef.current.forEach((channel, key) => {
      console.log(`📡 Unsubscribing from channel: ${key}`)
      try {
        supabase.removeChannel(channel)
      } catch (err) {
        console.warn('⚠️ Error removing channel:', key, err)
      }
    })
    realtimeChannelsRef.current.clear()
    
    // Run cleanup functions
    cleanupFunctionsRef.current.forEach(cleanup => {
      try {
        cleanup()
      } catch (err) {
        console.warn('⚠️ Cleanup function error:', err)
      }
    })
    cleanupFunctionsRef.current = []
    
    // Reset states
    setRealtimeConnected(false)
    setCurrentRoomId(null)
    setMessages([])
    setError(null)
    
    console.log('✅ Chat connections cleanup completed')
  }, [clearLoadingTimeout, clearConnectionRetry])

  // Load chat rooms dengan improved error handling
  const loadChatRooms = useCallback(async () => {
    if (!userInfo?.id) {
      console.log('⚠️ No user info available, skipping loadChatRooms')
      setError('User not authenticated')
      return
    }

    if (loading) {
      console.log('🔄 loadChatRooms already in progress, skipping...')
      return
    }

    console.log(`📨 Loading chat rooms for user: ${userInfo.id} (vendor: ${userInfo.isVendor})`)
    
    setLoading(true)
    setError(null)
    
    // Set timeout untuk prevent stuck loading
    clearLoadingTimeout()
    loadingTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Loading timeout, resetting state')
      setLoading(false)
      setError('Loading timeout - please try again')
    }, 20000) // Reduced to 20 seconds
    
    try {
      let query = supabase
        .from('chat_rooms')
        .select(`
          id,
          vendor_id,
          client_id,
          last_message_at,
          last_message_preview,
          unread_count_vendor,
          unread_count_client,
          status,
          created_at,
          updated_at,
          last_activity_at
        `)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false })

      if (userInfo.isVendor) {
        // Get vendor ID first
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', userInfo.id)
          .single()

        if (vendorError) {
          console.warn('❌ Error getting vendor data:', vendorError.message)
          setChatRooms([])
          return
        }

        if (!vendorData) {
          console.log('📝 No vendor profile found')
          setChatRooms([])
          return
        }

        query = query.eq('vendor_id', vendorData.id)
      } else {
        query = query.eq('client_id', userInfo.id)
      }

      const { data: rawChatRooms, error } = await query

      if (error) {
        console.error('❌ Error loading chat rooms:', error.message)
        setError(`Error loading chats: ${error.message}`)
        setChatRooms([])
        return
      }

      if (!rawChatRooms || rawChatRooms.length === 0) {
        console.log('📝 No chat rooms found')
        setChatRooms([])
        return
      }

      console.log(`📝 Found ${rawChatRooms.length} chat rooms, loading details...`)
      
      // Load details for each room dengan parallel processing
      const chatRoomsWithDetails = await Promise.all(
        rawChatRooms.map(async (room) => {
          try {
            // Load vendor info
            const { data: vendorData } = await supabase
              .from('vendors')
              .select(`
                id,
                business_name,
                user_profiles!vendors_user_id_fkey (
                  id,
                  full_name,
                  avatar_url
                )
              `)
              .eq('id', room.vendor_id)
              .single()

            // Load client info
            const { data: clientData } = await supabase
              .from('user_profiles')
              .select('id, full_name, avatar_url')
              .eq('id', room.client_id)
              .single()

            return {
              ...room,
              vendor: vendorData ? {
                id: vendorData.id,
                business_name: vendorData.business_name,
                user_id: '', // placeholder
                user_profiles: Array.isArray(vendorData.user_profiles) 
                  ? vendorData.user_profiles[0] 
                  : vendorData.user_profiles
              } : undefined,
              client: clientData
            } as unknown as ChatRoom
          } catch (err) {
            console.warn('⚠️ Error loading room details:', err)
            return {
              ...room,
              vendor: undefined,
              client: null
            } as unknown as ChatRoom
          }
        })
      )

      setChatRooms(chatRoomsWithDetails)
      console.log(`✅ Successfully loaded ${chatRoomsWithDetails.length} chat rooms`)
      
    } catch (error) {
      console.error('❌ Exception in loadChatRooms:', error)
      setError('Failed to load chats - please try again')
      setChatRooms([])
    } finally {
      clearLoadingTimeout()
      setLoading(false)
    }
  }, [userInfo, loading, clearLoadingTimeout])

  // Initialize chat when user is ready
  useEffect(() => {
    const currentSessionId = userInfo?.sessionId
    
    // Reset jika session berubah
    if (lastSessionIdRef.current !== currentSessionId) {
      console.log('🔄 Session changed, reinitializing chat...')
      cleanupConnections()
      initializationRef.current = false
      lastSessionIdRef.current = currentSessionId || null
    }
    
    // Initialize hanya jika belum initialized dan user tersedia
    if (!initializationRef.current && userInfo?.id && isAuthenticated) {
      console.log('🚀 Initializing chat for user:', userInfo.id)
      initializationRef.current = true
      
      // Load chat rooms dengan delay untuk ensure auth stability
      setTimeout(() => {
        loadChatRooms()
      }, 1000)
    }
    
    // Cleanup jika user tidak tersedia
    if (!userInfo?.id || !isAuthenticated) {
      cleanupConnections()
      initializationRef.current = false
      setChatRooms([])
    }
    
  }, [userInfo?.id, userInfo?.sessionId, isAuthenticated, loadChatRooms, cleanupConnections])

  // Load messages untuk room tertentu dengan improved error handling
  const loadMessages = useCallback(async (roomId: string) => {
    if (!userInfo?.id) {
      console.log('⚠️ No user ID, skipping loadMessages')
      setError('User not authenticated')
      return
    }

    console.log(`📩 Loading messages for room: ${roomId}`)
    setLoading(true)
    setError(null)
    setCurrentRoomId(roomId)
    
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          id,
          room_id,
          sender_id,
          content,
          message_type,
          file_url,
          file_name,
          file_size,
          read_at,
          delivered_at,
          reply_to_message_id,
          created_at,
          updated_at,
          service_preview,
          sender:user_profiles!messages_sender_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ Error loading messages:', error.message)
        setError(`Error loading messages: ${error.message}`)
        setMessages([])
        return
      }

      const messages = messagesData || []
      setMessages(messages as unknown as Message[])
      lastMessageCountRef.current = messages.length
      console.log(`✅ Loaded ${messages.length} messages for room ${roomId}`)
      
      // Setup realtime subscription untuk room ini - menggunakan ref untuk avoid dependency issue
      if (setupMessageSubscriptionRef.current) {
        setupMessageSubscriptionRef.current(roomId)
      }
      
    } catch (error) {
      console.error('❌ Exception loading messages:', error)
      setError('Failed to load messages')
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [userInfo?.id])

  // Setup realtime subscription dengan retry mechanism - menggunakan ref untuk avoid dependency cycle
  const setupMessageSubscriptionRef = useRef<((roomId: string) => void) | null>(null)
  
  const setupMessageSubscription = useCallback((roomId: string) => {
    if (!userInfo?.id) {
      console.log('⏭️ No user ID, skipping messages subscription setup')
      return
    }

    // Remove existing subscription untuk room ini
    const existingChannel = realtimeChannelsRef.current.get(`messages_${roomId}`)
    if (existingChannel) {
      supabase.removeChannel(existingChannel)
      realtimeChannelsRef.current.delete(`messages_${roomId}`)
    }

    console.log(`📡 Setting up realtime subscription for room: ${roomId}`)
    
    const channel = subscribeToMessages(
      roomId,
      (payload) => {
        console.log('📩 Realtime message received:', payload.new?.id)
        
        if (payload.eventType === 'INSERT' && payload.new) {
          const newMessage = payload.new as unknown as Message
          setMessages(prev => {
            // Cek apakah message sudah ada
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) return prev
            
            return [...prev, newMessage]
          })
          lastMessageCountRef.current += 1
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const updatedMessage = payload.new as unknown as Message
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          )
        }
      },
      (error) => {
        console.error('❌ Realtime error:', error)
        setRealtimeConnected(false)
        
        // Retry connection after delay - menggunakan ref untuk avoid cycle
        clearConnectionRetry()
        connectionRetryRef.current = setTimeout(() => {
          console.log('🔄 Retrying realtime subscription for room:', roomId)
          if (setupMessageSubscriptionRef.current) {
            setupMessageSubscriptionRef.current(roomId)
          }
        }, 5000)
      }
    )

    if (channel) {
      realtimeChannelsRef.current.set(`messages_${roomId}`, channel)
      setRealtimeConnected(true)
      
      // Add cleanup function
      cleanupFunctionsRef.current.push(() => {
        supabase.removeChannel(channel)
      })
      
      // Monitor connection health
      const healthCheck = setInterval(() => {
        if (channel.state === 'closed' || channel.state === 'errored') {
          console.log('⚠️ Channel state unhealthy:', channel.state)
          clearInterval(healthCheck)
          setRealtimeConnected(false)
          
          // Auto-retry - menggunakan ref untuk avoid cycle
          setTimeout(() => {
            if (setupMessageSubscriptionRef.current) {
              setupMessageSubscriptionRef.current(roomId)
            }
          }, 3000)
        }
      }, 10000) // Check every 10 seconds
      
      cleanupFunctionsRef.current.push(() => {
        clearInterval(healthCheck)
      })
    }
  }, [userInfo?.id, clearConnectionRetry])

  // Update ref dengan fungsi terbaru
  useEffect(() => {
    setupMessageSubscriptionRef.current = setupMessageSubscription
  })

  // Send message function dengan improved error handling
  const sendMessage = useCallback(async (roomId: string, content: string, messageType: string = 'text') => {
    if (!userInfo?.id) {
      throw new Error('User not authenticated')
    }

    console.log(`💬 Sending message to room: ${roomId}`)
    
    try {
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: userInfo.id,
          content,
          message_type: messageType,
          delivered_at: new Date().toISOString()
        })
        .select(`
          id,
          room_id,
          sender_id,
          content,
          message_type,
          created_at,
          sender:user_profiles!messages_sender_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .single()

      if (error) {
        console.error('❌ Error sending message:', error.message)
        throw new Error(error.message)
      }

      // Update last message preview in chat room
      await supabase
        .from('chat_rooms')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: content.substring(0, 100)
        })
        .eq('id', roomId)

      console.log('✅ Message sent successfully:', newMessage?.id)
      return true

    } catch (error) {
      console.error('❌ Exception sending message:', error)
      throw error
    }
  }, [userInfo?.id])

  // Get or create chat room function (for ChatModal compatibility)
  const getOrCreateChatRoom = useCallback(async (vendorId: string) => {
    if (!userInfo?.id) {
      throw new Error('User not authenticated')
    }

    console.log(`💭 Getting or creating chat room with vendor: ${vendorId}`)
    
    try {
      // Check jika room sudah ada
      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('vendor_id', vendorId)
        .eq('client_id', userInfo.id)
        .eq('status', 'active')
        .single()

      if (existingRoom) {
        console.log('📝 Chat room already exists:', existingRoom.id)
        return existingRoom.id
      }

      // Create new room
      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert({
          vendor_id: vendorId,
          client_id: userInfo.id,
          status: 'active',
          last_message_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (error) {
        console.error('❌ Error creating chat room:', error.message)
        throw new Error(error.message)
      }

      console.log('✅ Chat room created:', newRoom.id)
      
      // Refresh chat rooms list
      setTimeout(() => {
        loadChatRooms()
      }, 1000)
      
      return newRoom.id
    } catch (error) {
      console.error('❌ Exception in getOrCreateChatRoom:', error)
      throw error
    }
  }, [userInfo?.id, loadChatRooms])

  // Monitor realtime connection status
  useEffect(() => {
    const checkConnection = () => {
      const isConnected = supabase.realtime?.isConnected() || false
      setRealtimeConnected(isConnected)
      
      if (!isConnected && currentRoomId) {
        console.log('⚠️ Realtime disconnected, attempting to reconnect...')
        setTimeout(() => {
          setupMessageSubscription(currentRoomId)
        }, 2000)
      }
    }

    const interval = setInterval(checkConnection, 15000) // Check every 15 seconds
    
    return () => clearInterval(interval)
  }, [currentRoomId, setupMessageSubscription])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupConnections()
      clearConnectionRetry()
    }
  }, [cleanupConnections, clearConnectionRetry])

  return {
    chatRooms,
    messages,
    loading,
    error,
    realtimeConnected,
    currentRoomId,
    loadChatRooms,
    loadMessages,
    sendMessage,
    getOrCreateChatRoom,
    cleanupConnections
  }
} 