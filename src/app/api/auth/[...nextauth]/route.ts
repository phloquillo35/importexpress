import { handlers } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limit"
import { NextRequest } from "next/server"

export const GET = handlers.GET

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const check = rateLimit(ip)
  if (!check.success) {
    return Response.json({ error: "Too many requests" }, { status: 429 })
  }
  return handlers.POST(request)
}