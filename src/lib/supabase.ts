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
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'wedshoot@1.0.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    // Optimasi untuk production
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        // Add connection timeout untuk mencegah hanging requests
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })
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
    const { error } = await supabase.auth.getSession()
    if (error) return
    // Session info logged in development only
  } catch {
    // Error silently handled
  }
}

// Auto initialize auth listener
supabase.auth.onAuthStateChange(() => {
  if (process.env.NODE_ENV === 'development') {
    // Auth state changes logged in development only
  }
})

// Clear auth data helper
export const clearAuthData = () => {
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.includes('supabase')) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
  } catch {
    // Silent cleanup
  }
}

// Helper function untuk checking koneksi
export const checkSupabaseConnection = async () => {
  try {
    const { error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true })
    
    if (error) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}

// Helper function untuk test auth
export const testSupabaseAuth = async () => {
  try {
    const { error } = await supabase.auth.getSession()
    return !error
  } catch {
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
        onError?.(err?.toString() || status)
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
  onRoomUpdate: (payload: RealtimePayload) => void,
  onError?: (error: string) => void
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
        const room = payload.new as Record<string, unknown>
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
        const room = payload.new as Record<string, unknown>
        if (room.client_id === userId || room.vendor_id === userId) {
          onRoomUpdate({ ...payload, eventType: 'INSERT' })
        }
      }
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        onError?.(err?.toString() || status)
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
  
  return {
    isConnected: supabase.realtime?.isConnected() || false,
    channelCount: channels.length,
    channels: channels
  }
}

// Connection retry utility
export const retryRealtimeConnection = async (maxRetries = 3, delay = 2000) => {
  if (process.env.NODE_ENV !== 'development') return false
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Disconnect dan reconnect
      await supabase.realtime.disconnect()
      await new Promise(resolve => setTimeout(resolve, delay))
      await supabase.realtime.connect()
      
      // Test connection
      const status = debugRealtimeStatus()
      if (status?.isConnected) {
        return true
      }
      
    } catch {
      // Error handled silently
    }
    
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 1.5 // Exponential backoff
    }
  }
  
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
    
    return results
  } catch {
    results.errors.push('Health check failed')
    return results
  }
}

export default supabase 