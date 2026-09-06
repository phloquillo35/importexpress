import pg from "pg"

const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})

async function main() {
  const res = await pool.query("SELECT NOW() as time, current_database() as db, version() as version")
  console.log("✅ Conexión exitosa a Supabase")
  console.log("   DB:", res.rows[0].db)
  console.log("   Hora:", res.rows[0].time)
  console.log("   Versión:", res.rows[0].version.split(",")[0])
  
  const tables = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name
  `)
  console.log("\n📋 Tablas existentes:", tables.rows.length)
  tables.rows.forEach(r => console.log("  -", r.table_name))
  
  await pool.end()
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
