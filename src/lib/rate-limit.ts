/**
 * Simple in-memory rate limiter for API routes.
 * No external dependencies — uses a Map with automatic cleanup.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 60 })
 *   const allowed = limiter.check(request)
 *   if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 })
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimiterOptions {
  /** Time window in milliseconds (default: 60 seconds) */
  windowMs?: number
  /** Max requests per window (default: 60) */
  max?: number
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs ?? 60_000
  const max = options.max ?? 60
  const hits = new Map<string, RateLimitEntry>()

  // Cleanup stale entries every 5 minutes
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of hits) {
      if (now > entry.resetAt) hits.delete(key)
    }
  }, 5 * 60_000).unref()

  function getClientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for")
    if (forwarded) return forwarded.split(",")[0].trim()
    return request.headers.get("x-real-ip") ?? "unknown"
  }

  function check(request: Request): boolean {
    const ip = getClientIp(request)
    const now = Date.now()
    const entry = hits.get(ip)

    if (!entry || now > entry.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + windowMs })
      return true
    }

    entry.count++
    return entry.count <= max
  }

  return { check }
}

/** Pre-configured limiter for public endpoints: 60 req/min per IP */
export const publicRateLimiter = createRateLimiter({ windowMs: 60_000, max: 60 })

/**
 * Legacy-compatible rate limiter for auth endpoints.
 * Usage: const check = rateLimit(ip); if (!check.success) { ... }
 * 10 attempts per minute per IP.
 */
const authHits = new Map<string, RateLimitEntry>()
const AUTH_WINDOW_MS = 60_000
const AUTH_MAX = 10

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of authHits) {
    if (now > entry.resetAt) authHits.delete(key)
  }
}, 5 * 60_000).unref()

export function rateLimit(ip: string): { success: boolean } {
  const now = Date.now()
  const entry = authHits.get(ip)

  if (!entry || now > entry.resetAt) {
    authHits.set(ip, { count: 1, resetAt: now + AUTH_WINDOW_MS })
    return { success: true }
  }

  entry.count++
  return { success: entry.count <= AUTH_MAX }
}
