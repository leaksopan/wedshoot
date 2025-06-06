import { supabase } from '@/lib/supabase'

/**
 * Debug utility untuk monitoring Supabase Realtime connection
 */
export const debugRealtimeConnection = () => {
  const debugLog = () => {
    if (process.env.NODE_ENV === 'development') {
      // Debug info available in development only
    }
  }

  // Check connection status
  const checkConnectionStatus = () => {
    debugLog()
  }

  // Test basic realtime connection
  const testBasicConnection = () => {
    const testChannel = supabase
      .channel('realtime-test')
      .on('broadcast', { event: 'test' }, () => {
        debugLog()
      })
      .subscribe((status) => {
        debugLog()
        
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
            debugLog()
          }, 5000)
        }
      })
  }

  // Monitor messages table realtime
  const monitorMessagesTable = (roomId: string) => {
    debugLog()
    
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
        () => {
          debugLog()
        }
      )
      .subscribe(() => {
        debugLog()
      })

    return () => {
      supabase.removeChannel(monitorChannel)
      debugLog()
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
    const { error } = await supabase
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
      return false
    }

    return true
  } catch {
    return false
  }
} 