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

// Global connection manager untuk prevent multiple instances
let connectionAttempts = 0
const MAX_RECONNECTION_ATTEMPTS = 5
const BASE_RECONNECT_DELAY = 1000

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Dynamic storage key untuk avoid conflicts antar user sessions
    storageKey: `wedshoot-auth-${typeof window !== 'undefined' ? window.location.hostname : 'default'}`,
    storage: typeof window !== 'undefined' ? {
      getItem: (key: string) => {
        try {
          const item = window.localStorage.getItem(key)
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔑 Getting storage item: ${key}`, !!item)
          }
          return item
        } catch (err) {
          console.warn('⚠️ Error getting storage item:', key, err)
          return null
        }
      },
      setItem: (key: string, value: string) => {
        try {
          window.localStorage.setItem(key, value)
          if (process.env.NODE_ENV === 'development') {
            console.log(`💾 Setting storage item: ${key}`)
          }
        } catch (err) {
          console.warn('⚠️ Error setting storage item:', key, err)
        }
      },
      removeItem: (key: string) => {
        try {
          window.localStorage.removeItem(key)
          if (process.env.NODE_ENV === 'development') {
            console.log(`🗑️ Removing storage item: ${key}`)
          }
        } catch (err) {
          console.warn('⚠️ Error removing storage item:', key, err)
        }
      }
    } : undefined
  },
  realtime: {
    params: {
      eventsPerSecond: 20, // Increased from 10
      timeout: 15000, // 15 seconds timeout
    },
    // Improved realtime configuration dengan auto-reconnect
    heartbeatIntervalMs: 20000, // Reduced from 30s to 20s
    reconnectAfterMs: (attempts: number) => {
      const delay = Math.min(attempts * BASE_RECONNECT_DELAY, 10000)
      console.log(`🔄 Reconnecting after ${delay}ms (attempt ${attempts})`)
      return delay
    },
    encode: (payload: Record<string, unknown>, callback: (encoded: string) => void) => {
      callback(JSON.stringify(payload))
    },
    decode: (payload: string, callback: (decoded: Record<string, unknown> | null) => void) => {
      try {
        callback(JSON.parse(payload))
      } catch (err) {
        console.error('❌ Realtime decode error:', err)
        callback(null)
      }
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

// Connection monitoring untuk auto-reconnect
let realtimeMonitor: NodeJS.Timeout | null = null
let isReconnecting = false

// Start realtime monitoring
const startRealtimeMonitoring = () => {
  if (realtimeMonitor || typeof window === 'undefined') return

  realtimeMonitor = setInterval(() => {
    if (isReconnecting) return

    const isConnected = supabase.realtime?.isConnected()
    
    if (!isConnected && connectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
      console.log('🔄 Realtime disconnected, attempting to reconnect...')
      attemptReconnection()
    }
  }, 10000) // Check every 10 seconds
}

// Auto-reconnection function
const attemptReconnection = async () => {
  if (isReconnecting || connectionAttempts >= MAX_RECONNECTION_ATTEMPTS) return

  isReconnecting = true
  connectionAttempts++

  try {
    console.log(`🔄 Reconnection attempt ${connectionAttempts}/${MAX_RECONNECTION_ATTEMPTS}`)
    
    // Disconnect existing connection
    await supabase.realtime.disconnect()
    
    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, BASE_RECONNECT_DELAY * connectionAttempts))
    
    // Reconnect
    await supabase.realtime.connect()
    
    // Reset counter on successful connection
    connectionAttempts = 0
    console.log('✅ Realtime reconnected successfully')
    
  } catch (err) {
    console.error(`❌ Reconnection attempt ${connectionAttempts} failed:`, err)
  } finally {
    isReconnecting = false
  }
}

// Start monitoring when module loads
if (typeof window !== 'undefined') {
  startRealtimeMonitoring()
}

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

// Auto initialize auth listener dengan error handling
supabase.auth.onAuthStateChange((event, session) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 Auth state change:', {
      event,
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email
    })
  }
  
  // Reset connection attempts on auth change
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    connectionAttempts = 0
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

// Enhanced realtime subscription dengan retry mechanism
export const subscribeToMessages = (
  roomId: string, 
  onMessage: (payload: RealtimePayload) => void,
  onError?: (error: string) => void
) => {
  // Validasi input
  if (!roomId) {
    console.error('❌ No roomId provided for message subscription')
    onError?.('No room ID provided')
    return null
  }

  const channelName = `messages:${roomId}:${Date.now()}`
  
  console.log('📡 Setting up messages subscription for room:', roomId)
  
  const channel = supabase
    .channel(channelName, {
      config: {
        presence: {
          key: `user_${roomId}`
        },
        // Enhanced broadcast configuration
        broadcast: {
          self: false,
          ack: true
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
        console.error('❌ Channel error:', err)
        onError?.(err?.toString() || status)
        // Auto retry after delay
        setTimeout(() => {
          console.log('🔄 Retrying subscription for room:', roomId)
          subscribeToMessages(roomId, onMessage, onError)
        }, 5000)
      } else if (status === 'TIMED_OUT') {
        console.error('⏰ Subscription timed out')
        onError?.('Connection timed out')
      } else if (status === 'CLOSED') {
        console.warn('🔒 Subscription closed')
        onError?.('Connection closed')
      } else if (status === 'SUBSCRIBED') {
        console.log('✅ Messages subscription active for room:', roomId)
        connectionAttempts = 0 // Reset on successful subscription
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
        console.error('❌ Chat rooms channel error:', err)
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
  
  // Reset connection counter
  connectionAttempts = 0
}

// Debug realtime status dengan improved monitoring - hanya untuk development
export const debugRealtimeStatus = () => {
  if (process.env.NODE_ENV !== 'development') return null
  
  const channels = supabase.getChannels()
  const status = {
    isConnected: supabase.realtime?.isConnected() || false,
    connectionAttempts,
    isReconnecting,
    channelCount: channels.length,
    channels: channels.map(ch => ({
      topic: ch.topic,
      state: ch.state
    }))
  }
  
  console.log('📊 Realtime status:', status)
  return status
}

// Enhanced connection retry utility
export const retryRealtimeConnection = async (maxRetries = 3, delay = 2000) => {
  console.log('🔄 Manual realtime connection retry...')
  
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
        console.log('✅ Manual reconnection successful')
        connectionAttempts = 0
        return true
      }
      
    } catch (err) {
      console.error(`❌ Retry attempt ${attempt} failed:`, err)
    }
    
    // Increase delay for next attempt
    delay *= 1.5
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
  realtime: {
    isConnected: boolean
    connectionAttempts: number
    isReconnecting: boolean
  }
}

export const performRealtimeHealthCheck = async (): Promise<HealthCheckResult | null> => {
  if (process.env.NODE_ENV !== 'development') return null
  
  console.log('🏥 Performing realtime health check...')
  
  const result: HealthCheckResult = {
    timestamp: new Date().toISOString(),
    connection: false,
    database: false,
    auth: false,
    channels: 0,
    errors: [],
    realtime: {
      isConnected: supabase.realtime?.isConnected() || false,
      connectionAttempts,
      isReconnecting
    }
  }
  
  try {
    // Test basic connection
    result.connection = await checkSupabaseConnection()
    
    // Test auth
    result.auth = await testSupabaseAuth()
    
    // Test database query
    const { error: dbError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)
    
    result.database = !dbError
    if (dbError) {
      result.errors.push(`Database: ${dbError.message}`)
    }
    
    // Count channels
    result.channels = supabase.getChannels().length
    
  } catch (err) {
    result.errors.push(`Health check error: ${err}`)
  }
  
  console.log('🏥 Health check results:', result)
  return result
}

export default supabase 