import { AuthErrors, LoginData, RegisterData } from '@/types/auth.types'

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Password validation
export const isValidPassword = (password: string): boolean => {
  // Minimal 8 karakter, ada huruf dan angka
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/
  return passwordRegex.test(password)
}

// Phone validation (Indonesian format)
export const isValidPhone = (phone: string): boolean => {
  // Format: 08xxx, +628xxx, atau 628xxx
  const phoneRegex = /^(\+?62|0)8[1-9][0-9]{6,9}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

// Login form validation
export const validateLoginForm = (data: LoginData): AuthErrors => {
  const errors: AuthErrors = {}

  if (!data.email.trim()) {
    errors.email = 'Email wajib diisi'
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Format email tidak valid'
  }

  if (!data.password.trim()) {
    errors.password = 'Password wajib diisi'
  } else if (data.password.length < 6) {
    errors.password = 'Password minimal 6 karakter'
  }

  return errors
}

// Register form validation
export const validateRegisterForm = (data: RegisterData): AuthErrors => {
  const errors: AuthErrors = {}

  // Email validation
  if (!data.email.trim()) {
    errors.email = 'Email wajib diisi'
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Format email tidak valid'
  }

  // Password validation
  if (!data.password.trim()) {
    errors.password = 'Password wajib diisi'
  } else if (!isValidPassword(data.password)) {
    errors.password = 'Password minimal 8 karakter, harus ada huruf dan angka'
  }

  // Confirm password validation
  if (!data.confirmPassword.trim()) {
    errors.confirmPassword = 'Konfirmasi password wajib diisi'
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Password tidak sama'
  }

  // Full name validation
  if (!data.fullName.trim()) {
    errors.fullName = 'Nama lengkap wajib diisi'
  } else if (data.fullName.trim().length < 2) {
    errors.fullName = 'Nama lengkap minimal 2 karakter'
  }

  // Phone validation
  if (!data.phone.trim()) {
    errors.phone = 'Nomor telepon wajib diisi'
  } else if (!isValidPhone(data.phone)) {
    errors.phone = 'Format nomor telepon tidak valid (contoh: 08123456789)'
  }

  return errors
}

// Format phone number
export const formatPhoneNumber = (phone: string): string => {
  let formatted = phone.replace(/\s/g, '')
  
  // Convert +62 atau 62 ke 0
  if (formatted.startsWith('+62')) {
    formatted = '0' + formatted.slice(3)
  } else if (formatted.startsWith('62')) {
    formatted = '0' + formatted.slice(2)
  }
  
  return formatted
}

// Check if form has errors
export const hasErrors = (errors: AuthErrors): boolean => {
  return Object.values(errors).some(error => error !== undefined && error !== '')
} 