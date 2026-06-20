import { NextRequest } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads")

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    await mkdir(UPLOADS_DIR, { recursive: true })

    const ext = file.name.split(".").pop()
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
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
