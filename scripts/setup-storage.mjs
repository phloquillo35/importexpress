import pg from "pg"

const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})

async function main() {
  console.log("📦 Configurando Supabase Storage...")
  
  // Create storage bucket
  await pool.query(`
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('products', 'products', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/avif'])
    ON CONFLICT (id) DO UPDATE SET 
      public = true,
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/avif']
  `)
  console.log("✅ Bucket 'products' creado")
  
  // Drop existing policies and recreate
  const policies = [
    "Public read access",
    "Authenticated insert", 
    "Authenticated update",
    "Authenticated delete",
    "Service role full access"
  ]
  
  for (const p of policies) {
    await pool.query(`DROP POLICY IF EXISTS "${p}" ON storage.objects`).catch(() => {})
  }
  
  // Create policies
  await pool.query(`
    CREATE POLICY "Public read access" ON storage.objects
    FOR SELECT USING (bucket_id = 'products')
  `)
  console.log("✅ Política de lectura pública")
  
  await pool.query(`
    CREATE POLICY "Authenticated insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'products')
  `)
  console.log("✅ Política de inserción")
  
  await pool.query(`
    CREATE POLICY "Service role full access" ON storage.objects
    FOR ALL USING (bucket_id = 'products')
  `)
  console.log("✅ Política service_role completa")
  
  // Verify
  const bucket = await pool.query("SELECT * FROM storage.buckets WHERE id = 'products'")
  console.log("\n📊 Bucket 'products' configurado:")
  console.log(`  Público: ${bucket.rows[0].public}`)
  console.log(`  Tamaño máximo: ${bucket.rows[0].file_size_limit / 1024 / 1024} MB`)
  
  const policiesList = await pool.query("SELECT policyname FROM storage.policies WHERE bucket_id = 'products'")
  console.log(`  Políticas: ${policiesList.rows.map(r => r.policyname).join(", ")}`)
  
  await pool.end()
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
