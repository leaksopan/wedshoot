import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Supabase configuration - UPDATED untuk WedShoot project
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rufdjysbrykvrtxyqxtg.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZmRqeXNicnlrdnJ0eHlxeHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDg5MjUsImV4cCI6MjA2NDY4NDkyNX0.EAhuwH-E0WA-Ocl_JLdNQNt8lI9fq_nfpxZhyOHw3-I'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce',
    // Paksa storage key yang benar untuk WedShoot
    storageKey: 'wedshoot-auth-token'
  },
  realtime: {
    params: {
      eventsPerSecond: 5, // Reduce untuk stabilitas
      heartbeatIntervalMs: 30000, // Increase untuk avoid timeout
      reconnectDelay: 2000, // Increase delay
      timeout: 20000 // Increase timeout
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'wedshoot@1.0.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  },
  // Add connection options untuk stabilitas
  db: {
    schema: 'public'
  }
})

// Debug configuration
if (typeof window !== 'undefined') {
  // Clear any old snapme sessions
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('snapme')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
  } catch (error) {
    // Silent cleanup
  }
}

// Helper function untuk checking koneksi
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true })
    
    if (error) {
      return false
    }
    
    return true
  } catch (error) {
    return false
  }
}

// Helper function untuk test auth
export const testSupabaseAuth = async () => {
  try {
    const { data, error } = await supabase.auth.getSession()
    return !error
  } catch (error) {
    return false
  }
}

// Realtime helpers untuk chat dengan improved error handling
export const subscribeToMessages = (
  roomId: string, 
  onMessage: (payload: any) => void,
  onError?: (error: any) => void
) => {
  const channelName = `messages:${roomId}:${Date.now()}`
  
  const channel = supabase
    .channel(channelName, {
      config: {
        presence: {
          key: `user_${roomId}`
        }
      }
    })
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        onMessage({ ...payload, eventType: 'INSERT' })
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        onMessage({ ...payload, eventType: 'UPDATE' })
      }
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        onError?.(err || status)
      } else if (status === 'TIMED_OUT') {
        onError?.('Connection timed out')
      } else if (status === 'CLOSED') {
        onError?.('Connection closed')
      }
    })

  return channel
}

export const subscribeToChatRooms = (
  userId: string,
  onRoomUpdate: (payload: any) => void,
  onError?: (error: any) => void
) => {
  const channelName = `chat_rooms:user:${userId}:${Date.now()}`
  
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_rooms'
      },
      (payload) => {
        // Filter hanya room yang user terlibat
        const room = payload.new as any
        if (room.client_id === userId || room.vendor_id === userId) {
          onRoomUpdate({ ...payload, eventType: 'UPDATE' })
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_rooms'
      },
      (payload) => {
        // Filter hanya room yang user terlibat
        const room = payload.new as any
        if (room.client_id === userId || room.vendor_id === userId) {
          onRoomUpdate({ ...payload, eventType: 'INSERT' })
        }
      }
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        onError?.(err || status)
      } else if (status === 'TIMED_OUT') {
        onError?.('Connection timed out')
      } else if (status === 'CLOSED') {
        onError?.('Connection closed')
      }
    })

  return channel
}

// Utility untuk unsubscribe semua channel
export const unsubscribeAll = () => {
  supabase.removeAllChannels()
}

// Debug realtime status dengan improved monitoring - hanya untuk development
export const debugRealtimeStatus = () => {
  if (process.env.NODE_ENV !== 'development') return null
  
  const channels = supabase.getChannels()
  console.log('🔍 Active Realtime Channels:', {
    count: channels.length,
    channels: channels.map(ch => ({
      topic: ch.topic,
      state: ch.state,
      isJoined: ch.state === 'joined'
    }))
  })
  
  // Check overall connection status
  console.log('🌐 Supabase Connection Status:', {
    realtime: supabase.realtime?.isConnected() || false,
    channels: channels.length,
    timestamp: new Date().toISOString()
  })
  
  return {
    isConnected: supabase.realtime?.isConnected() || false,
    channelCount: channels.length,
    channels: channels
  }
}

// Connection retry utility
export const retryRealtimeConnection = async (maxRetries = 3, delay = 2000) => {
  if (process.env.NODE_ENV !== 'development') return false
  
  console.log('🔄 Starting realtime connection retry...')
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Retry attempt ${attempt}/${maxRetries}`)
      
      // Disconnect dan reconnect
      await supabase.realtime.disconnect()
      await new Promise(resolve => setTimeout(resolve, delay))
      await supabase.realtime.connect()
      
      // Test connection
      const status = debugRealtimeStatus()
      if (status?.isConnected) {
        console.log('✅ Realtime connection restored!')
        return true
      }
      
    } catch (error) {
      console.error(`❌ Retry attempt ${attempt} failed:`, error)
    }
    
    if (attempt < maxRetries) {
      console.log(`⏳ Waiting ${delay}ms before next retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 1.5 // Exponential backoff
    }
  }
  
  console.error('❌ Failed to restore realtime connection after all retries')
  return false
}

// Health check utility
export const performRealtimeHealthCheck = async () => {
  if (process.env.NODE_ENV !== 'development') return null
  
  console.log('🏥 Performing realtime health check...')
  
  const results = {
    timestamp: new Date().toISOString(),
    connection: false,
    database: false,
    auth: false,
    channels: 0,
    errors: [] as string[]
  }
  
  try {
    // Test database connection
    const { error: dbError } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true })
    
    if (!dbError) {
      results.database = true
    } else {
      results.errors.push(`Database: ${dbError.message}`)
    }
    
    // Test auth
    const { error: authError } = await supabase.auth.getSession()
    if (!authError) {
      results.auth = true
    } else {
      results.errors.push(`Auth: ${authError.message}`)
    }
    
    // Test realtime
    const status = debugRealtimeStatus()
    if (status) {
      results.connection = status.isConnected
      results.channels = status.channelCount
    }
    
    if (!results.connection) {
      results.errors.push('Realtime: Not connected')
    }
    
  } catch (error) {
    results.errors.push(`Health check exception: ${error}`)
  }
  
  console.log('🏥 Health check results:', results)
  return results
} 