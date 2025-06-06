'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export const Header = () => {
  const { isAuthenticated, user, profile, loading } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (!error) {
        router.push('/')
      }
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const getDashboardRoute = () => {
    if (profile?.preferred_role === 'vendor') {
      return '/vendor/dashboard'
    }
    return '/dashboard'
  }

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
              WedShoot
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link 
              href="/" 
              className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              Home
            </Link>
            {profile?.preferred_role === 'vendor' ? (
              // Vendor Navigation
              <>
                <Link 
                  href="/vendor/services" 
                  className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
                >
                  My Services
                </Link>
                <Link 
                  href="/vendor/bookings" 
                  className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
                >
                  Bookings
                </Link>
                <Link 
                  href="/vendor/portfolio" 
                  className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
                >
                  Portfolio
                </Link>
              </>
            ) : (
              // Client Navigation
              <>
                <Link 
                  href="/vendors" 
                  className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
                >
                  Browse Vendors
                </Link>
                <Link 
                  href="/services" 
                  className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
                >
                  Services
                </Link>
              </>
            )}
            <Link 
              href="/about" 
              className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              About
            </Link>
          </nav>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {loading ? (
              <div className="animate-pulse flex space-x-4">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </div>
            ) : isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <span className="text-gray-700 text-sm">
                  Hi, {profile?.full_name || user?.email?.split('@')[0]}
                </span>
                <Link
                  href="/chat"
                  className="relative text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
                  title="Pesan"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {/* Notification badge placeholder */}
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    3
                  </span>
                </Link>
                <Link
                  href={getDashboardRoute()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 p-2"
              aria-label="Toggle mobile menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-4">
              <Link 
                href="/" 
                className="text-gray-600 hover:text-gray-900 transition-colors font-medium px-2 py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              {profile?.preferred_role === 'vendor' ? (
                // Vendor Mobile Navigation
                <>
                  <Link 
                    href="/vendor/services" 
                    className="text-gray-600 hover:text-gray-900 transition-colors font-medium px-2 py-1"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    My Services
                  </Link>
                  <Link 
                    href="/vendor/bookings" 
                    className="text-gray-600 hover:text-gray-900 transition-colors font-medium px-2 py-1"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Bookings
                  </Link>
                  <Link 
                    href="/vendor/portfolio" 
                    className="text-gray-600 hover:text-gray-900 transition-colors font-medium px-2 py-1"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Portfolio
                  </Link>
                </>
              ) : (
                // Client Mobile Navigation
                <>
                  <Link 
                    href="/vendors" 
                    className="text-gray-600 hover:text-gray-900 transition-colors font-medium px-2 py-1"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Browse Vendors
                  </Link>
                  <Link 
                    href="/services" 
                    className="text-gray-600 hover:text-gray-900 transition-colors font-medium px-2 py-1"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Services
                  </Link>
                </>
              )}
              <Link 
                href="/about" 
                className="text-gray-600 hover:text-gray-900 transition-colors font-medium px-2 py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </Link>
              
              {/* Mobile Auth Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                  </div>
                ) : isAuthenticated ? (
                  <div className="flex flex-col space-y-3">
                    <span className="text-gray-700 text-sm px-2">
                      Hi, {profile?.full_name || user?.email?.split('@')[0]}
                    </span>
                    <Link
                      href={getDashboardRoute()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium text-center"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut()
                        setIsMobileMenuOpen(false)
                      }}
                      className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium text-left px-2 py-1"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-3">
                    <Link
                      href="/login"
                      className="text-gray-600 hover:text-gray-900 transition-colors font-medium px-2 py-1"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium text-center"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
} 