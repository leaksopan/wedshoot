import { ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { DebugAuth } from './DebugAuth'

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