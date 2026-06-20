import { NextRequest } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    await mkdir(uploadsDir, { recursive: true })

    const ext = file.name.split(".").pop()
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
    const filepath = path.join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    return Response.json({
      url: `/uploads/${filename}`,
      filename,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return Response.json({ error: "Upload failed" }, { status: 500 })
  }
}
