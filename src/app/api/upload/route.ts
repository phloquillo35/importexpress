import { NextRequest } from "next/server"
import { randomUUID } from "crypto"
import { requireRole } from "@/lib/auth"

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

    // Import dinámico de Cloudinary (solo se carga cuando se usa esta ruta)
    const { v2: cloudinary } = await import("cloudinary")

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })

    // Subir a Cloudinary como base64 (más compatible con serverless)
    const base64 = buffer.toString("base64")
    const dataUri = `data:${file.type};base64,${base64}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "importexpress",
      public_id: randomUUID(),
      resource_type: "auto",
    })

    return Response.json({
      url: result.secure_url,
      public_id: result.public_id,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return Response.json({ error: "Upload failed" }, { status: 500 })
  }
}
