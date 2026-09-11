/**
 * One-off migration: downloads every Cloudinary-hosted product/hero image
 * and re-uploads it to the Supabase "products" storage bucket, then rewrites
 * the DB rows to point at the new Supabase URLs.
 *
 * Writes a full backup of the original image URLs to scripts/backups/ before
 * touching any row, so the migration can be reversed by hand if needed.
 *
 * Usage: npx tsx scripts/migrate-images-to-supabase.ts [--dry-run]
 */
import "dotenv/config"
import { PrismaClient } from "../src/generated/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"
import { writeFileSync, mkdirSync } from "fs"
import { join } from "path"

const DRY_RUN = process.argv.includes("--dry-run")

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const BUCKET = "products"
const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}

async function migrateUrl(url: string, cache: Map<string, string>): Promise<string> {
  if (!url.includes("res.cloudinary.com")) return url
  if (cache.has(url)) return cache.get(url)!

  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo descargar ${url}: HTTP ${res.status}`)
  const contentType = res.headers.get("content-type") || "image/jpeg"
  const ext = EXT_BY_CONTENT_TYPE[contentType] || "jpg"
  const buffer = Buffer.from(await res.arrayBuffer())

  const path = `migrated/${randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  })
  if (error) throw new Error(`No se pudo subir ${url} a Supabase: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  cache.set(url, data.publicUrl)
  return data.publicUrl
}

async function main() {
  mkdirSync(join(process.cwd(), "scripts/backups"), { recursive: true })
  const cache = new Map<string, string>()

  const products = await prisma.product.findMany({
    select: { id: true, slug: true, images: true },
  })
  const productsWithCloudinary = products.filter((p) =>
    JSON.stringify(p.images).includes("res.cloudinary.com")
  )

  const banners = await prisma.heroBanner.findMany({
    select: { id: true, image: true },
  })
  const bannersWithCloudinary = banners.filter((b) => b.image?.includes("res.cloudinary.com"))

  const backup = {
    timestamp: new Date().toISOString(),
    products: productsWithCloudinary.map((p) => ({ id: p.id, slug: p.slug, images: p.images })),
    banners: bannersWithCloudinary.map((b) => ({ id: b.id, image: b.image })),
  }
  const backupPath = join(process.cwd(), "scripts/backups", `images-backup-${Date.now()}.json`)
  writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  console.log(`Backup guardado en ${backupPath}`)
  console.log(
    `Productos con Cloudinary: ${productsWithCloudinary.length} / ${products.length}`
  )
  console.log(`Banners con Cloudinary: ${bannersWithCloudinary.length} / ${banners.length}`)

  if (DRY_RUN) {
    console.log("DRY RUN — no se modifica nada. Corré sin --dry-run para migrar de verdad.")
    return
  }

  let ok = 0
  let failed = 0

  for (const product of productsWithCloudinary) {
    try {
      const images = product.images as Array<{ url: string; color?: string }> | string[]
      const migrated = await Promise.all(
        images.map(async (img) => {
          if (typeof img === "string") return migrateUrl(img, cache)
          return { ...img, url: await migrateUrl(img.url, cache) }
        })
      )
      await prisma.product.update({
        where: { id: product.id },
        data: { images: migrated as never },
      })
      ok++
      console.log(`OK  producto ${product.slug}`)
    } catch (err) {
      failed++
      console.error(`FALLÓ producto ${product.slug}:`, (err as Error).message)
    }
  }

  for (const banner of bannersWithCloudinary) {
    try {
      const newUrl = await migrateUrl(banner.image!, cache)
      await prisma.heroBanner.update({ where: { id: banner.id }, data: { image: newUrl } })
      ok++
      console.log(`OK  banner ${banner.id}`)
    } catch (err) {
      failed++
      console.error(`FALLÓ banner ${banner.id}:`, (err as Error).message)
    }
  }

  console.log(`\nMigración terminada. OK: ${ok}  Fallidos: ${failed}`)
  if (failed > 0) {
    console.log("Los que fallaron siguen apuntando a Cloudinary sin tocar — reintentar corriendo el script de nuevo.")
  }
}

main()
  .catch((err) => {
    console.error("Error fatal:", err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
