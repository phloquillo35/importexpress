import { NextRequest } from "next/server"
import { readFile } from "fs/promises"
import path from "path"
import fs from "fs"

const UPLOAD_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads")

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: pathSegments } = await params
    const filename = pathSegments.join("/")
    const safeName = path.basename(filename)
    const filepath = path.join(UPLOAD_DIR, safeName)

    if (!filepath.startsWith(UPLOAD_DIR)) {
      return new Response("Invalid path", { status: 400 })
    }

    if (!fs.existsSync(filepath)) {
      return new Response("Not found", { status: 404 })
    }

    const buffer = await readFile(filepath)
    const ext = path.extname(safeName).toLowerCase()
    const mime: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
    }

    return new Response(buffer, {
      headers: {
        "Content-Type": mime[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
