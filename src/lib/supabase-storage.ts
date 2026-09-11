import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export const PRODUCTS_BUCKET = "products"

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

export async function uploadToSupabase(buffer: Buffer, contentType: string, extension: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const path = `${crypto.randomUUID()}.${extension}`

  const { error } = await supabaseAdmin.storage
    .from(PRODUCTS_BUCKET)
    .upload(path, buffer, { contentType, upsert: false })

  if (error) throw error

  const { data } = supabaseAdmin.storage.from(PRODUCTS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
