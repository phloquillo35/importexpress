import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

export const PRODUCTS_BUCKET = "products"

export async function uploadToSupabase(buffer: Buffer, contentType: string, extension: string) {
  const path = `${crypto.randomUUID()}.${extension}`

  const { error } = await supabaseAdmin.storage
    .from(PRODUCTS_BUCKET)
    .upload(path, buffer, { contentType, upsert: false })

  if (error) throw error

  const { data } = supabaseAdmin.storage.from(PRODUCTS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
