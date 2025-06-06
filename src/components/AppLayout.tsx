import { ReactNode, useEffect } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { DebugAuth } from './DebugAuth'
import { startPerformanceMonitoring } from '@/utils/performance'

interface AppLayoutProps {
  children: ReactNode
  showHeader?: boolean
  showFooter?: boolean
}

export const AppLayout = ({
  children,
  showHeader = true,
  showFooter = true
}: AppLayoutProps) => {
  // Initialize performance monitoring
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true') {
      startPerformanceMonitoring()
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {showHeader && <Header />}
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}
      <DebugAuth />
    </div>
  )
}