import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rufdjysbrykvrtxyqxtg.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZmRqeXNicnlrdnJ0eHlxeHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDg5MjUsImV4cCI6MjA2NDY4NDkyNX0.EAhuwH-E0WA-Ocl_JLdNQNt8lI9fq_nfpxZhyOHw3-I'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'wedshoot@1.0.0'
    }
  }
})

// Debug configuration
if (typeof window !== 'undefined') {
  console.log('🔧 Supabase Config:', {
    url: supabaseUrl,
    anonKey: supabaseAnonKey ? `${supabaseAnonKey.slice(0, 20)}...` : 'MISSING',
    hasEnvUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasEnvKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })
}

// Helper function untuk checking koneksi
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }
    
    console.log('✅ Supabase connected successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error)
    return false
  }
}

// Helper function untuk test auth
export const testSupabaseAuth = async () => {
  try {
    const { data, error } = await supabase.auth.getSession()
    console.log('Auth test result:', { data, error })
    return !error
  } catch (error) {
    console.error('Auth test error:', error)
    return false
  }
} 