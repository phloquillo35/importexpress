import pg from "pg"
const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})
async function main() {
  const products = await pool.query(`
    SELECT slug, images FROM public.product
    WHERE images IS NOT NULL AND jsonb_array_length(images) > 0
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(images) i WHERE i->>'url' LIKE '%supabase.co%')
    LIMIT 5
  `)
  for (const row of products.rows) {
    console.log(`\n=== ${row.slug} ===`)
    for (const i of row.images) {
      console.log(`  color=${i.color || '(none)'} | ${i.url}`)
    }
  }
  await pool.end()
}
main().catch(e => { console.error("Error:", e.message); process.exit(1) })
