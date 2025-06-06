'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, subscribeToMessages, subscribeToChatRooms, unsubscribeAll } from '@/lib/supabase'
import { ChatRoom, Message } from '@/types/database'
import { useAuth } from './useAuth'

export const useChat = () => {
  const { user, profile } = useAuth()
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  // Get atau create chat room antara user dan vendor
  const getOrCreateChatRoom = useCallback(async (vendorId: string): Promise<string | null> => {
    if (!user || !profile) {
      const errorMsg = 'User not authenticated in getOrCreateChatRoom'
      setError(errorMsg)
      return null
    }

    try {
      setError(null)
      
      // Cek apakah chat room sudah ada
      const { data: existingRoom, error: searchError } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('vendor_id', vendorId)
        .eq('client_id', user.id)
        .single()

      if (searchError && searchError.code !== 'PGRST116') {
        setError(`Error searching room: ${searchError.message}`)
        return null
      }

      if (existingRoom) {
        return existingRoom.id
      }

      // Jika belum ada, buat room baru
      const { data: newRoom, error: createError } = await supabase
        .from('chat_rooms')
        .insert({
          vendor_id: vendorId,
          client_id: user.id,
          status: 'active'
        })
        .select('id')
        .single()

      if (createError) {
        setError(`Error creating room: ${createError.message}`)
        return null
      }

      return newRoom.id
    } catch (error) {
      setError(`Exception: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return null
    }
  }, [user, profile])

  // Load chat rooms untuk user
  const loadChatRooms = useCallback(async () => {
    if (!user || !profile) {
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const isVendor = profile.is_vendor

      let query = supabase
        .from('chat_rooms')
        .select(`
          *,
          vendor:vendors(
            id,
            business_name,
            user_id,
            user_profiles:user_profiles(full_name, avatar_url)
          ),
          client:user_profiles!chat_rooms_client_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false })

      if (isVendor) {
        // Jika user adalah vendor, tampilkan rooms dimana mereka adalah vendor
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (vendorError) {
          setError(`Error getting vendor data: ${vendorError.message}`)
          setLoading(false)
          return
        }

        if (vendorData) {
          query = query.eq('vendor_id', vendorData.id)
        } else {
          setChatRooms([])
          setLoading(false)
          return
        }
      } else {
        // Jika user adalah client, tampilkan rooms dimana mereka adalah client
        query = query.eq('client_id', user.id)
      }

      const { data, error } = await query

      if (error) {
        setError(`Error loading rooms: ${error.message}`)
        setChatRooms([])
      } else {
        setChatRooms(data || [])
      }
    } catch (error) {
      setError(`Exception: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setChatRooms([])
    } finally {
      setLoading(false)
    }
  }, [user, profile])

  // Load messages untuk room tertentu
  const loadMessages = useCallback(async (roomId: string) => {
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
          created_at,
          updated_at,
          service_preview
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (messageError) {
        setError(`Error loading messages: ${messageError.message}`)
        setMessages([])
        return
      }

      // Load sender info separately untuk setiap message
      const messagesWithSender = await Promise.all(
        (messageData || []).map(async (message) => {
          // Get sender info dengan error handling yang lebih baik
          const { data: senderData, error: senderError } = await supabase
            .from('user_profiles')
            .select('id, full_name, avatar_url')
            .eq('id', message.sender_id)
            .maybeSingle()

          if (senderError) {
          }

          // Get reply_to info if exists
          let replyToData = undefined
          if (message.reply_to_message_id) {
            const { data: replyMessage, error: replyError } = await supabase
              .from('messages')
              .select(`
                id,
                content,
                message_type,
                sender_id
              `)
              .eq('id', message.reply_to_message_id)
              .maybeSingle()

            if (replyMessage && !replyError) {
              const { data: replySender } = await supabase
                .from('user_profiles')
                .select('id, full_name')
                .eq('id', replyMessage.sender_id)
                .maybeSingle()

              replyToData = {
                ...replyMessage,
                sender: replySender || undefined
              } as Message
            }
          }

          return {
            ...message,
            sender: senderData || undefined,
            reply_to: replyToData
          } as Message
        })
      )

      setMessages(messagesWithSender || [])
      setCurrentRoomId(roomId)

      // Mark messages as read
      if (user) {
        await markMessagesAsRead(roomId)
      }
    } catch (error) {
      setError(`Exception: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [user])

  // Send message
  const sendMessage = useCallback(async (
    roomId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'service_preview' = 'text',
    fileUrl?: string,
    fileName?: string,
    fileSize?: number,
    replyToMessageId?: string,
    servicePreview?: any
  ) => {
    if (!user || !content.trim()) {
      return false
    }

    // Create temporary message untuk optimistic update
    const tempMessage = {
      id: `temp-${Date.now()}`,
      room_id: roomId,
      sender_id: user.id,
      content: content.trim(),
      message_type: messageType,
      file_url: fileUrl || null,
      file_name: fileName || null,
      file_size: fileSize || null,
      reply_to_message_id: replyToMessageId || null,
      service_preview: servicePreview || null,
      read_at: null,
      delivered_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: {
        id: user.id,
        full_name: profile?.full_name || 'You',
        avatar_url: profile?.avatar_url || null
      }
    }

    try {
      setError(null)
      
      // Optimistic update - tambahkan message sementara
      setMessages(prevMessages => {
        const tempExists = prevMessages.some(msg => msg.id.startsWith('temp-'))
        if (tempExists) {
          // Update existing temp message
          return prevMessages.map(msg => 
            msg.id.startsWith('temp-') ? tempMessage : msg
          )
        } else {
          // Add new temp message
          const updatedMessages = [...prevMessages, tempMessage]
          return updatedMessages.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        }
      })
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content: content.trim(),
          message_type: messageType,
          file_url: fileUrl || null,
          file_name: fileName || null,
          file_size: fileSize || null,
          reply_to_message_id: replyToMessageId || null,
          service_preview: servicePreview || null
        })
        .select()
        .single()

      if (error) {
        setError(`Error sending message: ${error.message}`)
        
        // Remove temp message on error
        setMessages(prevMessages => 
          prevMessages.filter(msg => !msg.id.startsWith('temp-'))
        )
        
        return false
      }

      // Replace temp message dengan real message
      setMessages(prevMessages => {
        const filteredMessages = prevMessages.filter(msg => !msg.id.startsWith('temp-'))
        const messageWithSender = {
          ...data,
          sender: tempMessage.sender
        }
        
        const updatedMessages = [...filteredMessages, messageWithSender]
        return updatedMessages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      })

      // Update chat room last message info
      if (profile?.is_vendor) {
        // Vendor mengirim message, increment unread count client
        await supabase.rpc('increment_unread_count', {
          room_id: roomId,
          field_name: 'unread_count_client',
          last_msg_at: new Date().toISOString(),
          last_msg_preview: content.trim().substring(0, 100)
        })
      } else {
        // Client mengirim message, increment unread count vendor
        await supabase.rpc('increment_unread_count', {
          room_id: roomId,
          field_name: 'unread_count_vendor',
          last_msg_at: new Date().toISOString(),
          last_msg_preview: content.trim().substring(0, 100)
        })
      }

      return true
    } catch (error) {
      setError(`Exception: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Remove temp message on exception
      setMessages(prevMessages => 
        prevMessages.filter(msg => !msg.id.startsWith('temp-'))
      )
      
      return false
    }
  }, [user, profile])

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (roomId: string) => {
    if (!user) {
      return
    }

    try {
      // Mark unread messages as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .neq('sender_id', user.id)
        .is('read_at', null)

      // Reset unread count berdasarkan role user
      if (profile?.is_vendor) {
        await supabase
          .from('chat_rooms')
          .update({ unread_count_vendor: 0 })
          .eq('id', roomId)
      } else {
        await supabase
          .from('chat_rooms')
          .update({ unread_count_client: 0 })
          .eq('id', roomId)
      }
    } catch (error) {
      setError(`Exception marking as read: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [user, profile])

  // Setup realtime subscriptions dengan helper functions baru
  useEffect(() => {
    if (!user) {
      return
    }

    let messagesChannel: any = null
    let roomsChannel: any = null
    let retryAttempt = 0
    const maxRetries = 3

    // Cache untuk menyimpan sender data sementara
    const senderCache = new Map<string, any>()

    // Function untuk setup messages subscription dengan retry
    const setupMessagesSubscription = () => {
      if (!currentRoomId) return

      messagesChannel = subscribeToMessages(
        currentRoomId,
        async (payload) => {
          const eventType = payload.eventType || 'INSERT'
          
          if (eventType === 'INSERT' && payload.new) {
            const newMessage = payload.new as any
            
            // Skip jika message dari user sendiri (sudah ada dari optimistic update)
            if (newMessage.sender_id === user.id) {
              return
            }
            
            // Cek cache terlebih dahulu atau load sender info
            let senderData = senderCache.get(newMessage.sender_id)
            
            if (!senderData) {
              const { data: fetchedSender, error: senderError } = await supabase
                .from('user_profiles')
                .select('id, full_name, avatar_url')
                .eq('id', newMessage.sender_id)
                .maybeSingle()

              if (!senderError && fetchedSender) {
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
              markMessagesAsRead(currentRoomId)
            }, 1000)
            
          } else if (eventType === 'UPDATE' && payload.new) {
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === payload.new.id 
                  ? { ...msg, ...payload.new, sender: msg.sender }
                  : msg
              )
            )
          }
        },
        (error) => {
          setRealtimeConnected(false)
          
          // Auto retry untuk connection timeout
          if (error === 'Connection timed out' && retryAttempt < maxRetries) {
            retryAttempt++
            
            setTimeout(() => {
              // Cleanup existing channel
              if (messagesChannel) {
                supabase.removeChannel(messagesChannel)
              }
              // Retry setup
              setupMessagesSubscription()
            }, retryAttempt * 2000) // Exponential backoff
            
          } else {
            setError(`Koneksi realtime terputus: ${error}`)
          }
        }
      )
      
      // Update connection status dengan delay untuk memastikan subscription completed
      setTimeout(() => {
        setRealtimeConnected(true)
      }, 1000)
    }

    // Subscribe to messages untuk room yang aktif
    if (currentRoomId) {
      setupMessagesSubscription()
    }

    // Subscribe to chat rooms updates
    roomsChannel = subscribeToChatRooms(
      user.id,
      (payload) => {
        setTimeout(() => {
          loadChatRooms()
        }, 500)
      },
      (error) => {
      }
    )

    return () => {
      if (messagesChannel) {
        supabase.removeChannel(messagesChannel)
      }
      if (roomsChannel) {
        supabase.removeChannel(roomsChannel)
      }
      setRealtimeConnected(false)
      // Clear cache
      senderCache.clear()
      retryAttempt = 0
    }
  }, [user?.id, currentRoomId, markMessagesAsRead, loadChatRooms])

  // Fallback polling jika realtime tidak available
  useEffect(() => {
    if (!currentRoomId || !user) return
    
    // Jika realtime tidak connected setelah 10 detik, gunakan polling
    const fallbackTimer = setTimeout(() => {
      if (!realtimeConnected) {
        const pollingInterval = setInterval(() => {
          loadMessages(currentRoomId)
        }, 3000) // Poll every 3 seconds
        
        return () => {
          clearInterval(pollingInterval)
        }
      }
    }, 10000)
    
    return () => {
      clearTimeout(fallbackTimer)
    }
  }, [currentRoomId, user, realtimeConnected, loadMessages])

  // Clean up all channels on unmount
  useEffect(() => {
    return () => {
      unsubscribeAll()
    }
  }, [])

  // Debug error state
  useEffect(() => {
    if (error) {
    }
  }, [error])

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
    // Debug helpers
    debugInfo: process.env.NODE_ENV === 'development' ? {
      hasUser: !!user,
      hasProfile: !!profile,
      isVendor: profile?.is_vendor,
      currentRoomId,
      chatRoomsCount: chatRooms.length,
      messagesCount: messages.length,
      realtimeConnected
    } : null
  }
} 