import { Database } from '@/types/database'

// Database types
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

// Auth-related types
export interface AuthUser {
  id: string
  email: string
  emailConfirmed: boolean
  createdAt: string
}

export interface AuthSession {
  user: AuthUser | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
}

// Registration types
export interface RegisterData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  phone: string
  userType: 'client' | 'vendor'
}

export interface LoginData {
  email: string
  password: string
  rememberMe?: boolean
}

// Onboarding types
export interface ClientOnboardingData {
  location: string
  bio: string
  dateOfBirth?: string
  avatarUrl?: string
}

export interface VendorOnboardingData extends ClientOnboardingData {
  businessName: string
  categoryId: string
  description: string
  serviceAreas: string[]
  contactInfo: {
    whatsapp?: string
    instagram?: string
    website?: string
  }
  yearsOfExperience?: number
  teamSize?: number
  languagesSpoken: string[]
}

// Role switching
export type UserRole = 'client' | 'vendor'

export interface RoleSwitchData {
  newRole: UserRole
  userId: string
}

// Auth state
export interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
}

// Form validation
export interface AuthErrors {
  email?: string
  password?: string
  confirmPassword?: string
  fullName?: string
  phone?: string
  general?: string
} 