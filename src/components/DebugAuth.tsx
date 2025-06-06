'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { debugSessionState, clearSessionCache, refreshSession } from '@/utils/sessionUtils'
import { isAuthError } from '@/utils/errorBoundary'

export const DebugAuth = () => {
  const { isAuthenticated, user, profile, loading, error, clearCache } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // Hanya tampil di development
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  const handleDebugSession = async () => {
    await debugSessionState()
    // Get debug info untuk display
    try {
      const info = {
        authState: {
          isAuthenticated,
          hasUser: !!user,
          userId: user?.id,
          hasProfile: !!profile,
          preferredRole: profile?.preferred_role,
          loading,
          error
        },
        localStorage: typeof window !== 'undefined' ? {
          keys: Object.keys(localStorage).filter(key => key.includes('supabase'))
        } : 'N/A',
        sessionStorage: typeof window !== 'undefined' ? {
          keys: Object.keys(sessionStorage).filter(key => key.includes('supabase'))
        } : 'N/A'
      }
      setDebugInfo(info)
    } catch (err) {
      console.error('Error getting debug info:', err)
    }
  }

  const handleClearCache = () => {
    clearSessionCache()
    clearCache()
    setDebugInfo(null)
    alert('Cache cleared! Auth will reinitialize.')
  }

  const handleRefreshSession = async () => {
    const result = await refreshSession()
    const errorMessage = result.error && typeof result.error === 'object' && 'message' in result.error 
      ? (result.error as any).message 
      : 'Unknown error'
    alert(result.success ? 'Session refreshed!' : `Failed: ${errorMessage}`)
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-red-500 text-white px-3 py-2 rounded-md text-xs font-mono"
        >
          🐛 Auth Debug
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">Auth Debug</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Authenticated:</span>
          <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
            {isAuthenticated ? '✓' : '✗'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Loading:</span>
          <span className={loading ? 'text-yellow-600' : 'text-gray-600'}>
            {loading ? '⏳' : '✓'}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Has User:</span>
          <span className={user ? 'text-green-600' : 'text-red-600'}>
            {user ? '✓' : '✗'}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Has Profile:</span>
          <span className={profile ? 'text-green-600' : 'text-red-600'}>
            {profile ? '✓' : '✗'}
          </span>
        </div>

        {error && (
          <div className={`text-xs p-2 rounded ${
            isAuthError({ message: error }) 
              ? 'text-yellow-600 bg-yellow-50' 
              : 'text-red-600 bg-red-50'
          }`}>
            Error: {error}
            {isAuthError({ message: error }) && (
              <div className="text-xs mt-1 font-normal">
                (Auth error - normal untuk user yang belum login)
              </div>
            )}
          </div>
        )}

        <div className="pt-2 border-t space-y-1">
          <button
            onClick={handleDebugSession}
            className="w-full bg-blue-500 text-white px-2 py-1 rounded text-xs"
          >
            Debug Session
          </button>
          
          <button
            onClick={handleClearCache}
            className="w-full bg-yellow-500 text-white px-2 py-1 rounded text-xs"
          >
            Clear Cache
          </button>
          
          <button
            onClick={handleRefreshSession}
            className="w-full bg-green-500 text-white px-2 py-1 rounded text-xs"
          >
            Refresh Session
          </button>
        </div>

        {debugInfo && (
          <div className="mt-3 pt-2 border-t">
            <details className="text-xs">
              <summary className="cursor-pointer font-bold">Debug Info</summary>
              <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
} 