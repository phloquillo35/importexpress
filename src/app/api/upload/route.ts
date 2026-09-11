import { NextRequest } from "next/server"
import { requireRole } from "@/lib/auth"
import { uploadToSupabase } from "@/lib/supabase-storage"

const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return Response.json({ error: "File too large. Maximum size is 10MB" }, { status: 400 })
    }

    if (!ALLOWED_MIMES.includes(file.type)) {
      return Response.json({ error: "File type not allowed" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const url = await uploadToSupabase(buffer, file.type, EXTENSION_BY_MIME[file.type])

    return Response.json({ url })
  } catch (error) {
    console.error("Upload error:", error)
    return Response.json({ error: "Upload failed" }, { status: 500 })
  }
}
