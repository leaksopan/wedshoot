/**
 * Utility untuk handle auth errors dan mencegah error loops
 */

// Track error count untuk mencegah infinite loops
const errorCounts = new Map<string, number>()

export const handleAuthError = (error: Error | null, context: string = 'unknown') => {
  const errorKey = `${context}-${error?.name || 'unknown'}`
  const currentCount = errorCounts.get(errorKey) || 0
  
  // Reset counter setiap 5 menit
  setTimeout(() => {
    errorCounts.delete(errorKey)
  }, 5 * 60 * 1000)
  
  // Jika error sudah terjadi > 5x dalam 5 menit, stop processing
  if (currentCount >= 5) {
    return false
  }
  
  errorCounts.set(errorKey, currentCount + 1)
  
  // Handle specific auth errors
  if (error?.name === 'AuthSessionMissingError') {
    return false // Jangan retry
  }
  
  if (error?.message?.includes('refresh_token')) {
    return false // Jangan retry
  }
  
  return true // OK untuk retry
}

export const isAuthError = (error: Error | null): boolean => {
  return !!(error?.name?.includes('Auth') || 
         error?.message?.includes('session') ||
         error?.message?.includes('token'))
}

export const shouldRetryError = (error: Error | null, context: string = 'unknown'): boolean => {
  // Jangan retry auth errors
  if (isAuthError(error)) {
    return handleAuthError(error, context)
  }
  
  // Retry network errors
  if (error?.message?.includes('network') || 
      error?.message?.includes('fetch') ||
      error?.message?.includes('timeout')) {
    return true
  }
  
  return false
} 