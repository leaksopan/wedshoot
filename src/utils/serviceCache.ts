// Service caching utility untuk mengurangi database calls
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class ServiceCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if cache expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Get cache stats untuk debugging
  getStats() {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    
    return {
      totalEntries: entries.length,
      validEntries: entries.filter(([, entry]) => now - entry.timestamp <= entry.ttl).length,
      expiredEntries: entries.filter(([, entry]) => now - entry.timestamp > entry.ttl).length
    }
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Singleton instance
export const serviceCache = new ServiceCache()

// Auto cleanup every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    serviceCache.cleanup()
  }, 10 * 60 * 1000)
}

// Cache keys generator
export const getCacheKey = {
  service: (id: string) => `service:${id}`,
  vendor: (id: string) => `vendor:${id}`,
  category: (id: string) => `category:${id}`,
  availability: (vendorId: string, month: string) => `availability:${vendorId}:${month}`,
  bookings: (vendorId: string, month: string) => `bookings:${vendorId}:${month}`
}

// Helper function untuk cache dengan fallback
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try cache first
  const cached = serviceCache.get<T>(key)
  if (cached) {
    return cached
  }

  // Fetch fresh data
  const data = await fetcher()
  
  // Cache the result
  serviceCache.set(key, data, ttl)
  
  return data
}
