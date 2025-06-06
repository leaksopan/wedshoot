// Performance monitoring utilities untuk debugging loading issues

interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, unknown>
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private enabled: boolean = process.env.NODE_ENV === 'development'

  start(name: string, metadata?: Record<string, unknown>): void {
    if (!this.enabled) return

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    })
  }

  end(name: string): number | null {
    if (!this.enabled) return null

    const metric = this.metrics.get(name)
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`)
      return null
    }

    const endTime = performance.now()
    const duration = endTime - metric.startTime

    metric.endTime = endTime
    metric.duration = duration

    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`, metric.metadata)

    return duration
  }

  getMetric(name: string): PerformanceMetric | null {
    return this.metrics.get(name) || null
  }

  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values())
  }

  clear(): void {
    this.metrics.clear()
  }

  // Measure function execution time
  async measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    this.start(name, metadata)
    try {
      const result = await fn()
      this.end(name)
      return result
    } catch (error) {
      this.end(name)
      throw error
    }
  }

  // Report slow operations
  reportSlow(threshold: number = 1000): PerformanceMetric[] {
    if (!this.enabled) return []

    const slowMetrics = this.getAllMetrics().filter(
      metric => metric.duration && metric.duration > threshold
    )

    if (slowMetrics.length > 0) {
      console.warn('🐌 Slow operations detected:', slowMetrics)
    }

    return slowMetrics
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor()

// Web Vitals monitoring
export const measureWebVitals = () => {
  if (typeof window === 'undefined') return

  // Measure LCP (Largest Contentful Paint)
  new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1]
    console.log('🎯 LCP:', lastEntry.startTime)
  }).observe({ entryTypes: ['largest-contentful-paint'] })

  // Measure FID (First Input Delay)
  new PerformanceObserver((list) => {
    const entries = list.getEntries()
    entries.forEach((entry) => {
      const fidEntry = entry as PerformanceEventTiming // Type assertion for FID entry
      console.log('👆 FID:', fidEntry.processingStart - fidEntry.startTime)
    })
  }).observe({ entryTypes: ['first-input'] })

  // Measure CLS (Cumulative Layout Shift)
  let clsValue = 0
  new PerformanceObserver((list) => {
    const entries = list.getEntries()
    entries.forEach((entry) => {
      const layoutShiftEntry = entry as unknown as { hadRecentInput: boolean; value: number }
      if (!layoutShiftEntry.hadRecentInput) {
        clsValue += layoutShiftEntry.value
        console.log('📐 CLS:', clsValue)
      }
    })
  }).observe({ entryTypes: ['layout-shift'] })
}

// Database query performance tracking
export const trackDatabaseQuery = async <T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  return perfMonitor.measure(`db:${queryName}`, queryFn, {
    type: 'database',
    query: queryName
  })
}

// Component render performance tracking
export const trackComponentRender = (componentName: string) => {
  const startTime = performance.now()
  
  return () => {
    const duration = performance.now() - startTime
    if (duration > 16) { // Longer than 1 frame (60fps)
      console.warn(`🎨 Slow render: ${componentName} took ${duration.toFixed(2)}ms`)
    }
  }
}

// Network request performance tracking
export const trackNetworkRequest = async <T>(
  url: string,
  requestFn: () => Promise<T>
): Promise<T> => {
  return perfMonitor.measure(`network:${url}`, requestFn, {
    type: 'network',
    url
  })
}

// Bundle size tracking (development only)
export const trackBundleSize = () => {
  if (process.env.NODE_ENV !== 'development') return

  // Track when new chunks are loaded
  const webpackWindow = window as unknown as { __webpack_require__?: { cache: Record<string, unknown> } }
  const originalImport = webpackWindow.__webpack_require__?.cache
  if (originalImport) {
    console.log('📦 Bundle chunks loaded:', Object.keys(originalImport).length)
  }
}

// Memory usage tracking
export const trackMemoryUsage = () => {
  if (typeof window === 'undefined' || !('memory' in performance)) return

  const memory = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory
  console.log('🧠 Memory usage:', {
    used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
    total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
    limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
  })
}

// Auto-report performance issues
export const startPerformanceMonitoring = () => {
  if (typeof window === 'undefined') return

  // Report slow operations every 30 seconds
  setInterval(() => {
    perfMonitor.reportSlow(1000)
    trackMemoryUsage()
  }, 30000)

  // Measure web vitals
  measureWebVitals()
}
