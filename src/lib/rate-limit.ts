type RateLimitEntry = { count: number; resetTime: number }
const attempts = new Map<string, RateLimitEntry>()

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of attempts) {
      if (now > entry.resetTime) attempts.delete(key)
    }
  }, 5 * 60 * 1000)
}

export function rateLimit(ip: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): { success: boolean; remaining: number } {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetTime) {
    attempts.set(ip, { count: 1, resetTime: now + windowMs })
    return { success: true, remaining: maxAttempts - 1 }
  }
  if (entry.count >= maxAttempts) {
    return { success: false, remaining: 0 }
  }
  entry.count++
  return { success: true, remaining: maxAttempts - entry.count }
}