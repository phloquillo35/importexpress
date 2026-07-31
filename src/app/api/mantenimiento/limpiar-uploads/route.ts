import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"
import { promisify } from "util"

const unlinkAsync = promisify(fs.unlink)
const UPLOAD_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads")
const DATA_DIR = process.env.DATA_DIR || "/data"

/** Suma recursiva del tamaño de una ruta (con límite de profundidad). */
function dirSize(dir: string, depth = 0, maxDepth = 4): { bytes: number; entries: number } {
  let bytes = 0
  let entries = 0
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, entry.name)
      try {
        if (entry.isDirectory()) {
          if (depth < maxDepth) {
            const sub = dirSize(fp, depth + 1, maxDepth)
            bytes += sub.bytes
            entries += sub.entries + 1
          } else {
            // Sin descender más: contar el dir como 4096
            bytes += 4096
            entries++
          }
        } else {
          bytes += fs.statSync(fp).size
          entries++
        }
      } catch { /* sin permisos o archivo volátil */ }
    }
  } catch { /* dir no existe */ }
  return { bytes, entries }
}

/** Lista top-level de una ruta con tamaño individual (hasta cierto límite por dir). */
function topLevel(dir: string, maxDepth = 2): unknown[] {
  const out: unknown[] = []
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, entry.name)
      try {
        if (entry.isDirectory()) {
          const sub = dirSize(fp, 1, maxDepth)
          out.push({ name: entry.name, type: "dir", bytes: sub.bytes, mb: Math.round((sub.bytes / 1024 / 1024) * 10) / 10 })
        } else {
          const size = fs.statSync(fp).size
          out.push({ name: entry.name, type: "file", bytes: size, mb: Math.round((size / 1024 / 1024) * 10) / 10 })
        }
      } catch { /* sin permisos */ }
    }
  } catch { /* dir no existe */ }
  return out
}

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
    const dataStats = dirSize(DATA_DIR)
    return Response.json({
      dir: UPLOAD_DIR,
      files: files.length,
      totalBytes,
      totalMB: Math.round((totalBytes / 1024 / 1024) * 10) / 10,
      dataDir: {
        path: DATA_DIR,
        totalBytes: dataStats.bytes,
        totalMB: Math.round((dataStats.bytes / 1024 / 1024) * 10) / 10,
        entries: dataStats.entries,
        top: topLevel(DATA_DIR),
      },
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

    const dataStats = dirSize(DATA_DIR)
    return Response.json({
      deleted,
      failed,
      freedBytes: deletedBytes,
      freedMB: Math.round((deletedBytes / 1024 / 1024) * 10) / 10,
      remainingFiles: fs.readdirSync(UPLOAD_DIR).length,
      dataDir: {
        path: DATA_DIR,
        totalBytes: dataStats.bytes,
        totalMB: Math.round((dataStats.bytes / 1024 / 1024) * 10) / 10,
        entries: dataStats.entries,
        top: topLevel(DATA_DIR),
      },
    })
  } catch (error) {
    console.error("Error cleaning uploads dir:", error)
    return Response.json({ error: "Error limpiando directorio de uploads" }, { status: 500 })
  }
}
