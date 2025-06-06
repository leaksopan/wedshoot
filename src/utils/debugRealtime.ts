import { supabase } from '@/lib/supabase'

/**
 * Debug utility untuk monitoring Supabase Realtime connection
 */
export const debugRealtimeConnection = () => {
  const debugLog = (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 Realtime Debug: ${message}`, data)
    }
  }

  // Check connection status
  const checkConnectionStatus = () => {
    const channels = supabase.getChannels()
    debugLog('Active channels:', channels.map(ch => ({
      topic: ch.topic,
      state: ch.state,
      joinedAt: ch.joinedAt
    })))
  }

  // Test basic realtime connection
  const testBasicConnection = () => {
    const testChannel = supabase
      .channel('realtime-test')
      .on('broadcast', { event: 'test' }, (payload) => {
        debugLog('Test broadcast received:', payload)
      })
      .subscribe((status) => {
        debugLog('Test channel status:', status)
        
        if (status === 'SUBSCRIBED') {
          // Send test broadcast
          testChannel.send({
            type: 'broadcast',
            event: 'test',
            payload: { message: 'Test connection', timestamp: new Date().toISOString() }
          })
          
          // Cleanup after 5 seconds
          setTimeout(() => {
            supabase.removeChannel(testChannel)
            debugLog('Test channel cleaned up')
          }, 5000)
        }
      })
  }

  // Monitor messages table realtime
  const monitorMessagesTable = (roomId: string) => {
    debugLog('Starting messages table monitor for room:', roomId)
    
    const monitorChannel = supabase
      .channel(`debug_messages_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          debugLog('Messages table change detected:', {
            event: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old
          })
        }
      )
      .subscribe((status) => {
        debugLog('Messages monitor status:', status)
      })

    return () => {
      supabase.removeChannel(monitorChannel)
      debugLog('Messages monitor stopped')
    }
  }

  return {
    checkConnectionStatus,
    testBasicConnection,
    monitorMessagesTable
  }
}

/**
 * Test Supabase Realtime dengan insert dummy message
 */
export const testRealtimeWithMessage = async (roomId: string, userId: string) => {
  try {
    console.log('🧪 Testing realtime with dummy message...')
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: userId,
        content: `Realtime test ${new Date().toLocaleTimeString()}`,
        message_type: 'text'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to insert test message:', error)
      return false
    }

    console.log('✅ Test message inserted successfully:', data)
    return true
  } catch (error) {
    console.error('❌ Exception in realtime test:', error)
    return false
  }
} 