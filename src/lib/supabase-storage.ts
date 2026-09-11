import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import sharp from "sharp"

export const PRODUCTS_BUCKET = "products"
const ONE_YEAR_SECONDS = "31536000"
const MAX_DIMENSION = 1600

let cachedClient: SupabaseClient | null = null

/**
 * Instanciado bajo demanda: en el build de Docker las env vars de Supabase
 * no existen todavía (solo se inyectan en runtime), y crear el cliente a
 * nivel de módulo rompía `next build` al recolectar datos de /api/upload.
 */
function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Faltan las variables de entorno de Supabase (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)")
  }
  cachedClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  return cachedClient
}

/**
 * Comprime y convierte a WebP antes de subir (los archivos de la cámara del
 * cliente venían como PNG/JPEG de varios MB sin optimizar, lo que hacía la
 * web notablemente lenta) y marca la subida como cacheable por un año — el
 * nombre de archivo es un UUID nuevo en cada subida, nunca se reutiliza.
 */
export async function uploadToSupabase(buffer: Buffer, contentType: string) {
  const supabaseAdmin = getSupabaseAdmin()

  const isRasterImage = ["image/png", "image/jpeg", "image/webp"].includes(contentType)
  const optimized = isRasterImage
    ? await sharp(buffer)
        .rotate()
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer()
    : buffer
  const finalContentType = isRasterImage ? "image/webp" : contentType
  const finalExtension = isRasterImage ? "webp" : contentType.split("/")[1] || "bin"
  const path = `${crypto.randomUUID()}.${finalExtension}`

  const { error } = await supabaseAdmin.storage
    .from(PRODUCTS_BUCKET)
    .upload(path, optimized, { contentType: finalContentType, upsert: false, cacheControl: ONE_YEAR_SECONDS })

  if (error) throw error

  const { data } = supabaseAdmin.storage.from(PRODUCTS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
