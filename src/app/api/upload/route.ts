import { NextRequest } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"
import { requireRole } from "@/lib/auth"

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads")
const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]

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

    await mkdir(UPLOADS_DIR, { recursive: true })

    const ext = file.name.split(".").pop()
    const filename = `${randomUUID()}.${ext}`
    const filepath = path.join(UPLOADS_DIR, filename)
    await writeFile(filepath, buffer)

    return Response.json({
      url: `/api/uploads/${filename}`,
      filename,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return Response.json({ error: "Upload failed" }, { status: 500 })
  }
}
