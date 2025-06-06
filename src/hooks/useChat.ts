'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, subscribeToMessages, unsubscribeAll } from '@/lib/supabase'
import { ChatRoom, Message, Json } from '@/types/database'
import { useAuth } from './useAuth'

type SenderProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const useChat = () => {
  const { user, profile } = useAuth()
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  
  // Use refs untuk avoid dependency loops
  const userIdRef = useRef<string | null>(null)
  const profileRef = useRef<typeof profile | null>(null)
  const currentRoomIdRef = useRef<string | null>(null)
  const isLoadingRoomsRef = useRef(false) // Add flag to prevent concurrent loads
  const lastInitTimeRef = useRef<number>(0) // Add throttling for initialization
  
  // Update refs ketika values berubah
  useEffect(() => {
    userIdRef.current = user?.id || null
    profileRef.current = profile
    currentRoomIdRef.current = currentRoomId
    
    // Add debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('📋 useChat refs updated:', {
        userId: userIdRef.current,
        hasProfile: !!profileRef.current,
        profileIsVendor: profileRef.current?.is_vendor,
        currentRoomId: currentRoomIdRef.current
      })
    }
  }, [user?.id, profile, currentRoomId])

  // Memoize user info untuk stabilitas - FIXED dependencies
  const userInfo = useMemo(() => {
    const info = {
      id: user?.id || null,
      isVendor: profile?.is_vendor || false,
      fullName: profile?.full_name || null,
      avatarUrl: profile?.avatar_url || null
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('👤 userInfo memoized:', info)
    }
    
    return info
  }, [user?.id, profile?.is_vendor, profile?.full_name, profile?.avatar_url])

  // Initialize chat state - hanya sekali saat user dan profile tersedia
  const initializeChatState = useCallback(async () => {
    const userId = userIdRef.current
    const userProfile = profileRef.current
    const now = Date.now()
    
    // Throttle initialization to prevent rapid calls
    if (now - lastInitTimeRef.current < 5000) {
      console.log('⏭️ Throttling chat initialization - too soon since last init')
      return
    }
    
    if (!userId || !userProfile) {
      console.log('⏭️ Skipping chat initialization - missing user or profile:', {
        hasUserId: !!userId,
        hasProfile: !!userProfile
      })
      return
    }
    
    lastInitTimeRef.current = now
    console.log('🚀 Initializing chat state for user:', userId)
    
    // Auto-load chat rooms if not loading already
    if (!isLoadingRoomsRef.current) {
      setTimeout(() => {
        loadChatRooms()
      }, 500) // Small delay to ensure UI is ready
    }
  }, []) // No dependencies - menggunakan refs

  // Auto initialize when user and profile are ready - ONLY ONCE
  useEffect(() => {
    if (userInfo.id && profile && !isLoadingRoomsRef.current) {
      console.log('✅ User and profile ready, initializing chat...')
      initializeChatState()
    }
  }, [userInfo.id, !!profile]) // Remove initializeChatState dependency to prevent loops

  // Load chat rooms untuk user - OPTIMIZED dengan prevent concurrent calls
  const loadChatRooms = useCallback(async () => {
    const userId = userIdRef.current
    const userProfile = profileRef.current
    
    if (!userId || !userProfile) {
      console.log('⚠️ No user or profile, skipping loadChatRooms', { 
        userId: !!userId, 
        profile: !!userProfile 
      })
      return
    }

    // Prevent concurrent loading
    if (isLoadingRoomsRef.current) {
      console.log('🔄 loadChatRooms already in progress, skipping...')
      return
    }

    console.log('📨 Loading chat rooms for user:', { userId, isVendor: userProfile.is_vendor })
    
    isLoadingRoomsRef.current = true
    setLoading(true)
    setError(null)
    
    try {
      const isVendor = userProfile.is_vendor

      // Simplified query structure untuk avoid nested relation conflicts
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

      if (isVendor) {
        // Jika user adalah vendor, tampilkan rooms dimana mereka adalah vendor
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (vendorError) {
          if (vendorError.code !== 'PGRST116') {
            setError(`Error getting vendor data: ${vendorError.message}`)
          }
          setChatRooms([])
          setLoading(false)
          isLoadingRoomsRef.current = false
          return
        }

        if (vendorData) {
          query = query.eq('vendor_id', vendorData.id)
        } else {
          setChatRooms([])
          setLoading(false)
          isLoadingRoomsRef.current = false
          return
        }
      } else {
        // Jika user adalah client, tampilkan rooms dimana mereka adalah client
        query = query.eq('client_id', userId)
      }

      const { data: rawChatRooms, error } = await query

      if (error) {
        console.warn(`❌ Error loading rooms: ${error.message}`)
        setChatRooms([])
      } else if (rawChatRooms && rawChatRooms.length > 0) {
        console.log('📝 Raw chat rooms found:', rawChatRooms.length)
        
        // Load vendor and client info untuk setiap room
        const chatRoomsWithDetails = []
        
        for (const room of rawChatRooms) {
          console.log('🔄 Processing room:', room.id)
          
          // Load vendor info
          const { data: vendorData, error: vendorError } = await supabase
            .from('vendors')
            .select(`
              id,
              business_name,
              user_id
            `)
            .eq('id', room.vendor_id)
            .maybeSingle()
          
          if (vendorError) {
            console.warn('⚠️ Vendor error:', vendorError)
          }

          // Load vendor profile
          let vendorProfile = null
          if (vendorData?.user_id) {
            const { data: vpData } = await supabase
              .from('user_profiles')
              .select('full_name, avatar_url')
              .eq('id', vendorData.user_id)
              .maybeSingle()
            vendorProfile = vpData
          }

          // Load client info
          const { data: clientData, error: clientError } = await supabase
            .from('user_profiles')
            .select('id, full_name, avatar_url')
            .eq('id', room.client_id)
            .maybeSingle()
          
          if (clientError) {
            console.warn('⚠️ Client error:', clientError)
          }

          const roomWithDetails = {
            ...room,
            vendor: vendorData ? {
              id: vendorData.id,
              business_name: vendorData.business_name,
              user_id: vendorData.user_id,
              user_profiles: vendorProfile || undefined
            } : undefined,
            client: clientData ? {
              id: clientData.id,
              full_name: clientData.full_name,
              avatar_url: clientData.avatar_url
            } : undefined
          }
          
          chatRoomsWithDetails.push(roomWithDetails)
        }

        console.log('✅ Chat rooms loaded with details:', chatRoomsWithDetails.length)
        setChatRooms(chatRoomsWithDetails)
      } else {
        console.log('📭 No chat rooms found')
        setChatRooms([])
      }
    } catch (error) {
      console.error(`❌ Exception in loadChatRooms: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setChatRooms([])
    } finally {
      setLoading(false)
      isLoadingRoomsRef.current = false
    }
  }, []) // No dependencies - menggunakan refs

  // Get or create chat room dengan vendor - IMPROVED
  const getOrCreateChatRoom = useCallback(async (vendorId: string, vendorName: string, serviceName?: string) => {
    const userId = userIdRef.current
    if (!userId) {
      throw new Error('User not authenticated')
    }

    console.log('🔍 Getting or creating chat room:', { vendorId, vendorName, serviceName })

    try {
      // Check existing room first
      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('vendor_id', vendorId)
        .eq('client_id', userId)
        .eq('status', 'active')
        .maybeSingle()

      if (existingRoom) {
        console.log('✅ Found existing room:', existingRoom.id)
        return existingRoom.id
      }

      // Create new room
      const { data: newRoom, error: createError } = await supabase
        .from('chat_rooms')
        .insert({
          vendor_id: vendorId,
          client_id: userId,
          status: 'active' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (createError) {
        throw new Error(`Failed to create chat room: ${createError.message}`)
      }

      console.log('✅ Created new room:', newRoom.id)
      
      // Refresh chat rooms list after creating new room
      setTimeout(() => {
        loadChatRooms()
      }, 1000)

      return newRoom.id
    } catch (error) {
      console.error('❌ Error in getOrCreateChatRoom:', error)
      throw error
    }
  }, [loadChatRooms])

  // Mark messages as read by current user
  const markMessagesAsRead = useCallback(async (roomId: string) => {
    const userId = userIdRef.current
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .neq('sender_id', userId)
        .is('read_at', null)

      if (error) {
        console.warn(`⚠️ Error marking messages as read: ${error.message}`)
      } else {
        console.log('✅ Messages marked as read for room:', roomId)
      }
    } catch (err) {
      console.warn(`❌ Exception in markMessagesAsRead: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, []) // No dependencies - menggunakan refs

  // Load messages untuk room tertentu - OPTIMIZED
  const loadMessages = useCallback(async (roomId: string) => {
    console.log('📨 Loading messages for room:', roomId)
    setLoading(true)
    setError(null)
    
    try {
      // Simplified query - load basic message data first
      const { data: messageData, error: messageError } = await supabase
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
          service_preview,
          created_at,
          updated_at
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (messageError) {
        throw new Error(`Failed to load messages: ${messageError.message}`)
      }

      if (!messageData || messageData.length === 0) {
        console.log('📭 No messages found for room:', roomId)
        setMessages([])
        return
      }

      console.log('📨 Found messages:', messageData.length)

      // Load sender profiles for all unique senders
      const uniqueSenderIds = [...new Set(messageData.map(msg => msg.sender_id))]
      console.log('👥 Loading profiles for senders:', uniqueSenderIds.length)

      const { data: senderProfiles, error: senderError } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .in('id', uniqueSenderIds)

      if (senderError) {
        console.warn('⚠️ Error loading sender profiles:', senderError.message)
      }

      // Create sender lookup map
      const senderMap = new Map(
        (senderProfiles || []).map(profile => [profile.id, profile])
      )

      // Combine messages with sender data
      const messagesWithSenders = messageData.map(message => ({
        ...message,
        service_preview: message.service_preview || null,
        sender: senderMap.get(message.sender_id) || undefined
      }))

      console.log('✅ Messages loaded with sender data:', messagesWithSenders.length)
      setMessages(messagesWithSenders)
      setCurrentRoomId(roomId)

      // Mark messages as read
      setTimeout(() => {
        markMessagesAsRead(roomId)
      }, 1000)

    } catch (error) {
      console.error(`❌ Exception in loadMessages: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setError(error instanceof Error ? error.message : 'Failed to load messages')
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [markMessagesAsRead])

  // Send message - OPTIMIZED dengan optimistic UI update
  const sendMessage = useCallback(async (roomId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text') => {
    const userId = userIdRef.current
    const userProfile = profileRef.current
    
    if (!userId || !userProfile) {
      throw new Error('User not authenticated')
    }

    console.log('📤 Sending message:', { roomId, messageType, contentLength: content.length })

    // Create temporary message untuk optimistic UI update
    const tempId = `temp-${Date.now()}`
    const tempMessage = {
      id: tempId,
      room_id: roomId,
      sender_id: userId,
      content,
      message_type: messageType,
      file_url: null,
      file_name: null,
      file_size: null,
      read_at: null,
      delivered_at: null,
      reply_to_message_id: null,
      service_preview: null as Json,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: {
        id: userId,
        full_name: userProfile.full_name,
        avatar_url: userProfile.avatar_url
      }
    }

    // Add optimistic update
    setMessages(prevMessages => [...prevMessages, tempMessage])

    try {
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: userId,
          content,
          message_type: messageType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (error) {
        // Remove optimistic update on error
        setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempId))
        throw new Error(`Failed to send message: ${error.message}`)
      }

      console.log('✅ Message sent successfully:', newMessage.id)

      // Replace temp message dengan real message
      setMessages(prevMessages => {
        const withoutTemp = prevMessages.filter(msg => msg.id !== tempId)
        const realMessage = {
          ...newMessage,
          sender: {
            id: userId,
            full_name: userProfile.full_name,
            avatar_url: userProfile.avatar_url
          }
        }
        return [...withoutTemp, realMessage]
      })

      // Update chat room's last activity
      supabase
        .from('chat_rooms')
        .update({
          last_activity_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
          last_message_preview: content.substring(0, 100),
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId)
        .then(({ error: updateError }) => {
          if (updateError) {
            console.warn('⚠️ Failed to update room activity:', updateError.message)
          }
        })

      return newMessage.id

    } catch (error) {
      // Remove optimistic update on error
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempId))
      console.error('❌ Error sending message:', error)
      throw error
    }
  }, [])

  // Setup realtime subscriptions - OPTIMIZED untuk prevent loops
  useEffect(() => {
    const userId = userInfo.id
    
    if (!userId) {
      console.log('⏭️ No user ID, skipping realtime setup')
      return
    }

    console.log('📡 Setting up realtime subscriptions for user:', userId)

    const roomsChannel: RealtimeChannel | null = null
    
    // Note: Messages subscription moved to separate effect below

    // Subscribe to chat rooms updates - TEMPORARILY DISABLED untuk prevent loops
    console.log('📡 Setting up chat rooms subscription (currently disabled)')
    
    // DISABLED: Chat rooms realtime updates untuk prevent infinite loops
    // Will be re-enabled after fixing the underlying issue
    
    // let roomUpdateTimeout: NodeJS.Timeout | null = null
    // 
    // roomsChannel = subscribeToChatRooms(
    //   userId,
    //   () => {
    //     console.log('🔄 Chat room updated via realtime')
    //     
    //     // Clear previous timeout
    //     if (roomUpdateTimeout) {
    //       clearTimeout(roomUpdateTimeout)
    //     }
    //     
    //     // Heavy debounce untuk prevent excessive calls
    //     roomUpdateTimeout = setTimeout(() => {
    //       if (!isLoadingRoomsRef.current) {
    //         console.log('🔄 Refreshing chat rooms due to realtime update (debounced)')
    //         loadChatRooms()
    //       } else {
    //         console.log('⏭️ Skipping room refresh - already loading')
    //       }
    //     }, 3000) // Increased to 3 seconds for heavy debounce
    //   },
    //   (error) => {
    //     console.warn('❌ Chat rooms subscription error:', error)
    //   }
    // )

    return () => {
      console.log('🧹 Cleaning up realtime subscriptions')
      if (roomsChannel) {
        supabase.removeChannel(roomsChannel)
      }
      setRealtimeConnected(false)
    }
  }, [userInfo.id]) // Remove currentRoomId dependency to prevent frequent re-subscriptions

  // Setup messages subscription saat room berubah - separate effect
  useEffect(() => {
    const userId = userInfo.id
    const roomId = currentRoomId
    
    if (!userId || !roomId) {
      console.log('⏭️ No user ID or room ID, skipping messages subscription setup')
      return
    }

    console.log('📡 Setting up messages subscription for new room:', roomId)

    let messagesChannel: RealtimeChannel | null = null
    let retryAttempt = 0
    const maxRetries = 3
    const senderCache = new Map<string, SenderProfile>()

    const setupSubscription = () => {
      messagesChannel = subscribeToMessages(
        roomId,
        async (payload) => {
          const eventType = payload.eventType || 'INSERT'
          
          if (eventType === 'INSERT' && payload.new) {
            const newMessage = payload.new as unknown as Message
            
            console.log('📩 New message received via realtime:', newMessage.id)
            
            // Skip jika message dari user sendiri (sudah ada dari optimistic update)
            if (newMessage.sender_id === userId) {
              console.log('⏭️ Skipping own message from realtime')
              return
            }
            
            // Load sender info jika belum ada di cache
            let senderData = senderCache.get(newMessage.sender_id)
            
            if (!senderData) {
              const { data: fetchedSender } = await supabase
                .from('user_profiles')
                .select('id, full_name, avatar_url')
                .eq('id', newMessage.sender_id)
                .maybeSingle()

              if (fetchedSender) {
                senderData = fetchedSender
                senderCache.set(newMessage.sender_id, senderData)
              }
            }

            const messageWithSender = {
              ...newMessage,
              sender: senderData || undefined
            }

            // Tambahkan message baru ke state
            setMessages(prevMessages => {
              const exists = prevMessages.some(msg => msg.id === newMessage.id)
              if (exists) {
                console.log('⏭️ Message already exists, skipping')
                return prevMessages
              }
              
              const updatedMessages = [...prevMessages, messageWithSender]
              
              // Sort messages by created_at untuk memastikan urutan yang benar
              return updatedMessages.sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
            })

            // Auto mark as read jika user sedang di room
            setTimeout(() => {
              markMessagesAsRead(roomId)
            }, 1000)
            
          } else if (eventType === 'UPDATE' && payload.new) {
            console.log('📝 Message updated via realtime')
          }
        },
        (error) => {
          console.warn('❌ Messages subscription error:', error)
          setRealtimeConnected(false)
          
          // Auto retry untuk connection timeout
          if (error === 'Connection timed out' && retryAttempt < maxRetries) {
            retryAttempt++
            console.log(`🔄 Retrying messages subscription (${retryAttempt}/${maxRetries})`)
            
            setTimeout(() => {
              // Cleanup existing channel
              if (messagesChannel) {
                supabase.removeChannel(messagesChannel)
              }
              // Retry setup
              setupSubscription()
            }, retryAttempt * 2000) // Exponential backoff
            
          } else {
            setError(`Koneksi realtime terputus: ${error}`)
          }
        }
      )
      
      // Update connection status dengan delay
      setTimeout(() => {
        setRealtimeConnected(true)
      }, 1000)
    }

    setupSubscription()

    return () => {
      console.log('🧹 Cleaning up messages subscription for room:', roomId)
      if (messagesChannel) {
        supabase.removeChannel(messagesChannel)
      }
      senderCache.clear()
      retryAttempt = 0
    }
  }, [currentRoomId, userInfo.id, markMessagesAsRead]) // Dependencies untuk room dan user changes

  // Fallback polling jika realtime tidak available - OPTIMIZED
  useEffect(() => {
    const roomId = currentRoomIdRef.current
    const userId = userIdRef.current
    
    if (!roomId || !userId) return
    
    // Jika realtime tidak connected setelah 10 detik, gunakan polling
    const fallbackTimer = setTimeout(() => {
      if (!realtimeConnected) {
        console.log('📡 Realtime not connected, starting fallback polling')
        const pollingInterval = setInterval(() => {
          const currentRoomId = currentRoomIdRef.current
          const currentUserId = userIdRef.current
          if (currentRoomId && currentUserId) {
            console.log('🔄 Polling messages (fallback mode)')
            // Use ref values directly to avoid dependency loop
            loadMessages(currentRoomId)
          }
        }, 10000) // Poll every 10 seconds (reduced frequency)
        
        return () => {
          clearInterval(pollingInterval)
        }
      }
    }, 10000)
    
    return () => {
      clearTimeout(fallbackTimer)
    }
  }, [realtimeConnected]) // Remove loadMessages dependency to prevent loops

  // Clean up all channels on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up all channels on unmount')
      unsubscribeAll()
    }
  }, [])

  // Debug error state
  useEffect(() => {
    if (error) {
      console.error('❌ useChat error state:', error)
    }
  }, [error])

  // Cleanup all connections
  const cleanupConnections = useCallback(() => {
    console.log('🧹 Cleaning up all connections')
    unsubscribeAll()
    setRealtimeConnected(false)
    setCurrentRoomId(null)
    setMessages([])
    setError(null)
    isLoadingRoomsRef.current = false
  }, [])

  return {
    chatRooms,
    messages,
    loading,
    currentRoomId,
    error,
    realtimeConnected,
    getOrCreateChatRoom,
    loadChatRooms,
    loadMessages,
    sendMessage,
    markMessagesAsRead,
    cleanupConnections,
    // Debug helpers
    debugInfo: process.env.NODE_ENV === 'development' ? {
      hasUser: !!userInfo.id,
      hasProfile: !!profileRef.current,
      isVendor: userInfo.isVendor,
      currentRoomId,
      chatRoomsCount: chatRooms.length,
      messagesCount: messages.length,
      realtimeConnected,
      isLoadingRooms: isLoadingRoomsRef.current
    } : null
  }
} 