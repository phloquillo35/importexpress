/**
 * Re-optimiza TODAS las imágenes ya subidas al bucket "products" de Supabase:
 * las descarga, las comprime a WebP con sharp, y las vuelve a subir al MISMO
 * path con Cache-Control de 1 año. No cambia ninguna URL ni toca la DB —
 * el Content-Type gobierna cómo el navegador decodifica el archivo, no la
 * extensión en la URL, así que es seguro aunque el path diga ".png".
 *
 * Motivo: las imágenes se subieron sin Cache-Control (recargaban de cero en
 * cada visita) y sin comprimir (varios MB cada una), lo que hacía la web
 * notablemente lenta. Ver también src/lib/supabase-storage.ts, que ya
 * aplica esto a las subidas nuevas.
 *
 * Usage: npx tsx scripts/optimize-existing-images.ts [--dry-run]
 */
import "dotenv/config"
import { PrismaClient } from "../src/generated/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { createClient } from "@supabase/supabase-js"
import sharp from "sharp"
import { writeFileSync, mkdirSync } from "fs"
import { dirname, join } from "path"

const DRY_RUN = process.argv.includes("--dry-run")
const BUCKET = "products"
const MAX_DIMENSION = 1600
const CACHE_CONTROL = "31536000"
const BACKUP_DIR = join(process.cwd(), "scripts/backups", `originals-${Date.now()}`)

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

function pathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

async function optimizeOne(path: string): Promise<{ before: number; after: number }> {
  const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(path)
  if (downloadError || !blob) throw new Error(`No se pudo descargar ${path}: ${downloadError?.message}`)
  const before = Buffer.from(await blob.arrayBuffer())

  const backupPath = join(BACKUP_DIR, path)
  mkdirSync(dirname(backupPath), { recursive: true })
  writeFileSync(backupPath, before)

  const optimized = await sharp(before)
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  if (!DRY_RUN) {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .update(path, optimized, { contentType: "image/webp", cacheControl: CACHE_CONTROL, upsert: true })
    if (uploadError) throw new Error(`No se pudo re-subir ${path}: ${uploadError.message}`)
  }

  return { before: before.length, after: optimized.length }
}

async function main() {
  const products = await prisma.product.findMany({ select: { images: true } })
  const banners = await prisma.heroBanner.findMany({ select: { image: true } })

  const paths = new Set<string>()
  for (const p of products) {
    const images = p.images as unknown
    if (Array.isArray(images)) {
      for (const img of images) {
        const url = typeof img === "string" ? img : (img as { url?: string })?.url
        const path = url ? pathFromPublicUrl(url) : null
        if (path) paths.add(path)
      }
    }
  }
  for (const b of banners) {
    const path = b.image ? pathFromPublicUrl(b.image) : null
    if (path) paths.add(path)
  }

  console.log(`${paths.size} imágenes únicas para optimizar. ${DRY_RUN ? "(dry run)" : ""}`)
  console.log(`Backup de originales en: ${BACKUP_DIR}`)

  let ok = 0
  let failed = 0
  let totalBefore = 0
  let totalAfter = 0

  for (const path of paths) {
    try {
      const { before, after } = await optimizeOne(path)
      totalBefore += before
      totalAfter += after
      ok++
      if (ok % 25 === 0) console.log(`... ${ok}/${paths.size}`)
    } catch (err) {
      failed++
      console.error(`FALLÓ ${path}:`, (err as Error).message)
    }
  }

  const savedMB = ((totalBefore - totalAfter) / 1024 / 1024).toFixed(1)
  const pct = totalBefore > 0 ? Math.round((1 - totalAfter / totalBefore) * 100) : 0
  console.log(`\nListo. OK: ${ok}  Fallidos: ${failed}`)
  console.log(`Peso total antes: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → después: ${(totalAfter / 1024 / 1024).toFixed(1)}MB (ahorro: ${savedMB}MB, ${pct}%)`)
}

main()
  .catch((err) => {
    console.error("Error fatal:", err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
