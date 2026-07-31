import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"
import { promisify } from "util"

const unlinkAsync = promisify(fs.unlink)
const UPLOAD_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads")

/**
 * Endpoint de mantenimiento: limpia el volumen local de uploads.
 * Protegido por CRON_SECRET (header x-cron-secret).
 * Solo borra archivos de imagen dentro de UPLOAD_DIR.
 * GET /api/mantenimiento/limpiar-uploads → devuelve estado (sin borrar)
 * POST /api/mantenimiento/limpiar-uploads → borra archivos y reporta
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("x-cron-secret")
  if (auth !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const files = fs.readdirSync(UPLOAD_DIR).filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
    let totalBytes = 0
    for (const f of files) {
      const fp = path.join(UPLOAD_DIR, f)
      try {
        totalBytes += fs.statSync(fp).size
      } catch { /* archivo puede no existir */ }
    }
    return Response.json({
      dir: UPLOAD_DIR,
      files: files.length,
      totalBytes,
      totalMB: Math.round((totalBytes / 1024 / 1024) * 10) / 10,
      mode: "GET — solo estado, usar POST para borrar",
    })
  } catch (error) {
    console.error("Error inspecting uploads dir:", error)
    return Response.json({ error: "Error inspeccionando directorio de uploads" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get("x-cron-secret")
  if (auth !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const files = fs.readdirSync(UPLOAD_DIR).filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
    let deletedBytes = 0
    let deleted = 0
    let failed = 0

    for (const f of files) {
      const fp = path.join(UPLOAD_DIR, f)
      try {
        const size = fs.statSync(fp).size
        await unlinkAsync(fp)
        deletedBytes += size
        deleted++
      } catch {
        failed++
      }
    }

    return Response.json({
      deleted,
      failed,
      freedBytes: deletedBytes,
      freedMB: Math.round((deletedBytes / 1024 / 1024) * 10) / 10,
      remainingFiles: fs.readdirSync(UPLOAD_DIR).length,
    })
  } catch (error) {
    console.error("Error cleaning uploads dir:", error)
    return Response.json({ error: "Error limpiando directorio de uploads" }, { status: 500 })
  }
}
