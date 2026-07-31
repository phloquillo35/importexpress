// Migración de imágenes locales → Cloudinary
// Uso:
//   node scripts/migrar-cloudinary.mjs --dry-run   (solo lista qué haría)
//   node scripts/migrar-cloudinary.mjs             (ejecuta migración real)
//
// Requiere env vars:
//   DATABASE_URL             → URL de conexión Postgres
//   CLOUDINARY_CLOUD_NAME    → wotjfeig
//   CLOUDINARY_API_KEY       → 111988123786537
//   CLOUDINARY_API_SECRET    → (en Railway env vars)
import pg from "pg"
import https from "https"
import { v2 as cloudinary } from "cloudinary"

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const DRY_RUN = process.argv.includes("--dry-run")
const BASE = "https://lopedis-lotenes.up.railway.app"
const FOLDER = "importexpress"
const MAX_CONCURRENT = 2 // Baja concurrencia: no saturar el servidor de producción
const MAX_RETRIES = 3
const RETRY_BASE_DELAY = 2000 // ms, backoff exponencial

function download(url, retries = MAX_RETRIES) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode} para ${url}`))
          return
        }
        const chunks = []
        res.on("data", (c) => chunks.push(c))
        res.on("end", () => resolve(Buffer.concat(chunks)))
      })
      .on("error", (e) => reject(e))
      .setTimeout(30000, () => reject(new Error(`Timeout para ${url}`)))
  }).catch(async (err) => {
    if (retries <= 0) throw err
    const delay = RETRY_BASE_DELAY * Math.pow(2, MAX_RETRIES - retries)
    await new Promise((r) => setTimeout(r, delay))
    return download(url, retries - 1)
  })
}

async function uploadToCloudinary(buffer, publicId, retries = MAX_RETRIES) {
  try {
    const dataUri = `data:application/octet-stream;base64,${buffer.toString("base64")}`
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: FOLDER,
      public_id: publicId,
      overwrite: true,
      resource_type: "auto",
    })
    return result.secure_url
  } catch (err) {
    if (retries <= 0) throw err
    const delay = RETRY_BASE_DELAY * Math.pow(2, MAX_RETRIES - retries)
    await new Promise((r) => setTimeout(r, delay))
    return uploadToCloudinary(buffer, publicId, retries - 1)
  }
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN — NO se sube nada ===" : "=== MIGRACIÓN REAL ===")

  // 1) Recopilar todos los registros con URLs locales
  const prods = await pool.query(`SELECT id, images FROM "Product" WHERE images IS NOT NULL AND images != '[]'::jsonb`)
  const heroes = await pool.query(`SELECT id, image FROM "HeroBanner" WHERE image IS NOT NULL AND image != ''`)

  const tasks = [] // { kind, recordId, updateSql, params, localUrl, publicId }

  for (const row of prods.rows) {
    const imgs = row.images
    if (!Array.isArray(imgs)) continue
    let changed = false
    const newImgs = imgs.map((img) => {
      const url = typeof img === "string" ? img : img?.url
      if (url && url.includes("/api/uploads/")) {
        changed = true
        const filename = url.split("/").pop() // uuid.ext
        const publicId = filename.replace(/\.[^.]+$/, "")
        tasks.push({
          kind: "product",
          recordId: row.id,
          localUrl: BASE + url,
          publicId,
          newUrl: null,
        })
        return { ...(typeof img === "string" ? {} : img), url: `CLOUDINARY:${publicId}`, _pending: true, _originalUrl: url }
      }
      return img
    })
    if (changed) {
      tasks.push({ kind: "product_update", recordId: row.id, newImgs })
    }
  }

  for (const row of heroes.rows) {
    if (row.image.includes("/api/uploads/")) {
      const publicId = row.image.split("/").pop().replace(/\.[^.]+$/, "")
      tasks.push({
        kind: "hero",
        recordId: row.id,
        localUrl: BASE + row.image,
        publicId,
        newUrl: null,
      })
    }
  }

  // 2) Separar uploads de updates
  const uploads = tasks.filter((t) => t.kind === "product" || t.kind === "hero")
  const updates = tasks.filter((t) => t.kind === "product_update")

  console.log(`\nUploads a realizar: ${uploads.length}`)
  console.log(`Productos a actualizar: ${updates.length}`)

  if (DRY_RUN) {
    console.log("\nPrimeros 5 uploads (muestra):")
    uploads.slice(0, 5).forEach((t) => console.log(`  ${t.publicId} ← ${t.localUrl}`))
    await pool.end()
    return
  }

  // 3) Procesar uploads con límite de concurrencia
  const urlMap = new Map() // publicId -> secure_url
  let done = 0, failed = 0
  const queue = [...uploads]

  async function worker() {
    while (queue.length) {
      const task = queue.shift()
      try {
        const buffer = await download(task.localUrl)
        const secureUrl = await uploadToCloudinary(buffer, task.publicId)
        urlMap.set(task.publicId, secureUrl)
        done++
        console.log(`[${done}/${uploads.length}] ${task.publicId} OK`)
      } catch (e) {
        failed++
        console.error(`✗ ${task.publicId}: ${e.message}`)
      }
    }
  }

  await Promise.all(Array.from({ length: MAX_CONCURRENT }, worker))

  console.log(`\nUploads completados: ${done}, fallidos: ${failed}`)

  // 4) Actualizar productos (mapping publicId -> secureUrl)
  let updated = 0, skippedFallback = 0
  for (const task of updates) {
    const newImgs = task.newImgs.map((img) => {
      if (img?._pending) {
        const secureUrl = urlMap.get(img.url.split(":")[1])
        if (!secureUrl) {
          // Upload falló: conservar la URL local original para reintentar después
          skippedFallback++
          return { url: img._originalUrl, color: img.color || "" }
        }
        delete img._pending
        delete img._originalUrl
        return { url: secureUrl, color: img.color || "" }
      }
      return img
    })
    await pool.query(`UPDATE "Product" SET images = $1::jsonb, "updatedAt" = now() WHERE id = $2`, [
      JSON.stringify(newImgs),
      task.recordId,
    ])
    updated++
  }
  console.log(`Productos actualizados en DB: ${updated} (con fallback local: ${skippedFallback})`)

  // 5) Actualizar hero banners
  let heroUpdated = 0
  for (const task of uploads.filter((t) => t.kind === "hero")) {
    const secureUrl = urlMap.get(task.publicId)
    if (!secureUrl) continue
    await pool.query(`UPDATE "HeroBanner" SET image = $1, "updatedAt" = now() WHERE id = $2`, [secureUrl, task.recordId])
    heroUpdated++
  }
  console.log(`Hero banners actualizados: ${heroUpdated}`)

  await pool.end()
  console.log("\n=== MIGRACIÓN FINALIZADA ===")
}

main().catch((e) => { console.error(e); process.exit(1) })
