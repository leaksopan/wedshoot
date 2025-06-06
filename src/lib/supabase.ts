import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Supabase configuration - FIXED dengan data dari MCP
const supabaseUrl = 'https://rufdjysbrykvrtxyqxtg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZmRqeXNicnlrdnJ0eHlxeHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDg5MjUsImV4cCI6MjA2NDY4NDkyNX0.EAhuwH-E0WA-Ocl_JLdNQNt8lI9fq_nfpxZhyOHw3-I'

// Debug configuration untuk development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Supabase Config:', {
    url: supabaseUrl,
    keyLength: supabaseAnonKey?.length,
    hasKey: !!supabaseAnonKey,
    project: 'WedShoot'
  })
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Improved auth configuration
    storageKey: 'wedshoot-auth-token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    },
    // Improved realtime configuration
    heartbeatIntervalMs: 30000,
    reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 30000)
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

// Debug session di development mode
export const debugSession = async () => {
  if (process.env.NODE_ENV !== 'development') return

  try {
    const { data: session, error } = await supabase.auth.getSession()
    console.log('🔐 Session Debug:', {
      hasSession: !!session?.session,
      hasUser: !!session?.session?.user,
      userId: session?.session?.user?.id,
      email: session?.session?.user?.email,
      error: error?.message
    })
    return { session: session?.session, error }
  } catch (err) {
    console.error('❌ Session debug error:', err)
    return { session: null, error: err }
  }
}

// Auto initialize auth listener
supabase.auth.onAuthStateChange((event, session) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 Auth state change:', {
      event,
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email
    })
  }
})

// Clear auth data helper
export const clearAuthData = () => {
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.includes('supabase') || key?.includes('wedshoot')) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
    
    console.log('🧹 Cleared auth data:', keysToRemove.length, 'keys')
  } catch (err) {
    console.warn('⚠️ Failed to clear auth data:', err)
  }
}

// Helper function untuk checking koneksi
export const checkSupabaseConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...')
    const { error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Connection test failed:', error.message)
      return false
    }
    
    console.log('✅ Supabase connection OK')
    return true
  } catch (err) {
    console.error('❌ Connection test exception:', err)
    return false
  }
}

// Helper function untuk test auth
export const testSupabaseAuth = async () => {
  try {
    const { data, error } = await supabase.auth.getSession()
    const isValid = !error && !!data.session
    
    console.log('🔐 Auth test:', {
      isValid,
      hasSession: !!data.session,
      error: error?.message
    })
    
    return isValid
  } catch (err) {
    console.error('❌ Auth test exception:', err)
    return false
  }
}

// Type untuk realtime payload
interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: Record<string, unknown>
  old?: Record<string, unknown>
  errors?: string[] | null
}

// Realtime helpers untuk chat dengan improved error handling
export const subscribeToMessages = (
  roomId: string, 
  onMessage: (payload: RealtimePayload) => void,
  onError?: (error: string) => void
) => {
  const channelName = `messages:${roomId}:${Date.now()}`
  
  console.log('📡 Setting up messages subscription for room:', roomId)
  
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
        console.log('📩 New message received:', payload.new?.id)
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
        console.log('📝 Message updated:', payload.new?.id)
        onMessage({ ...payload, eventType: 'UPDATE' })
      }
    )
    .subscribe((status, err) => {
      console.log('📡 Messages subscription status:', status, err?.message)
      
      if (status === 'CHANNEL_ERROR') {
        onError?.(err?.toString() || status)
      } else if (status === 'TIMED_OUT') {
        onError?.('Connection timed out')
      } else if (status === 'CLOSED') {
        onError?.('Connection closed')
      } else if (status === 'SUBSCRIBED') {
        console.log('✅ Messages subscription active for room:', roomId)
      }
    })

  return channel
}

export const subscribeToChatRooms = (
  userId: string,
  onRoomUpdate: (payload: RealtimePayload) => void,
  onError?: (error: string) => void
) => {
  const channelName = `chat_rooms:user:${userId}:${Date.now()}`
  
  console.log('📡 Setting up chat rooms subscription for user:', userId)
  
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
        const room = payload.new as Record<string, unknown>
        if (room.client_id === userId || room.vendor_id === userId) {
          console.log('🔄 Chat room updated:', room.id)
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
        const room = payload.new as Record<string, unknown>
        if (room.client_id === userId || room.vendor_id === userId) {
          console.log('➕ New chat room:', room.id)
          onRoomUpdate({ ...payload, eventType: 'INSERT' })
        }
      }
    )
    .subscribe((status, err) => {
      console.log('📡 Chat rooms subscription status:', status, err?.message)
      
      if (status === 'CHANNEL_ERROR') {
        onError?.(err?.toString() || status)
      } else if (status === 'TIMED_OUT') {
        onError?.('Connection timed out')
      } else if (status === 'CLOSED') {
        onError?.('Connection closed')
      } else if (status === 'SUBSCRIBED') {
        console.log('✅ Chat rooms subscription active for user:', userId)
      }
    })

  return channel
}

// Utility untuk unsubscribe semua channel
export const unsubscribeAll = () => {
  const channels = supabase.getChannels()
  console.log('🧹 Unsubscribing from', channels.length, 'channels')
  supabase.removeAllChannels()
}

// Debug realtime status dengan improved monitoring - hanya untuk development
export const debugRealtimeStatus = () => {
  if (process.env.NODE_ENV !== 'development') return null
  
  const channels = supabase.getChannels()
  const status = {
    isConnected: supabase.realtime?.isConnected() || false,
    channelCount: channels.length,
    channels: channels.map(ch => ({
      topic: ch.topic,
      state: ch.state
    }))
  }
  
  console.log('📊 Realtime status:', status)
  return status
}

// Connection retry utility
export const retryRealtimeConnection = async (maxRetries = 3, delay = 2000) => {
  if (process.env.NODE_ENV !== 'development') return false
  
  console.log('🔄 Retrying realtime connection...')
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}`)
      
      // Disconnect dan reconnect
      await supabase.realtime.disconnect()
      await new Promise(resolve => setTimeout(resolve, delay))
      await supabase.realtime.connect()
      
      // Test connection
      const status = debugRealtimeStatus()
      if (status?.isConnected) {
        console.log('✅ Realtime connection restored')
        return true
      }
      
    } catch (err) {
      console.error(`❌ Retry attempt ${attempt} failed:`, err)
    }
    
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 1.5 // Exponential backoff
    }
  }
  
  console.error('❌ All retry attempts failed')
  return false
}

interface HealthCheckResult {
  timestamp: string
  connection: boolean
  database: boolean
  auth: boolean
  channels: number
  errors: string[]
}

// Health check utility
export const performRealtimeHealthCheck = async (): Promise<HealthCheckResult | null> => {
  if (process.env.NODE_ENV !== 'development') return null
  
  console.log('🏥 Performing health check...')
  
  const results: HealthCheckResult = {
    timestamp: new Date().toISOString(),
    connection: false,
    database: false,
    auth: false,
    channels: 0,
    errors: []
  }
  
  try {
    // Test database connection
    results.database = await checkSupabaseConnection()
    
    // Test auth
    results.auth = await testSupabaseAuth()
    
    // Test realtime connection
    const realtimeStatus = debugRealtimeStatus()
    results.connection = realtimeStatus?.isConnected || false
    results.channels = realtimeStatus?.channelCount || 0
    
    console.log('🏥 Health check results:', results)
    return results
  } catch (err) {
    console.error('❌ Health check failed:', err)
    results.errors.push('Health check failed')
    return results
  }
}

export default supabase 