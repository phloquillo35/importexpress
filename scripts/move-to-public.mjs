import pg from "pg"

const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})

async function main() {
  console.log("🔄 Moviendo tablas de 'importexpress' a 'public'...")
  
  // Get all tables in importexpress schema
  const tables = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'importexpress' ORDER BY table_name
  `)
  
  for (const row of tables.rows) {
    const t = row.table_name
    try {
      // Move table to public schema
      await pool.query(`ALTER TABLE importexpress."${t}" SET SCHEMA public`)
      console.log(`  ✓ ${t} → public`)
    } catch (e) {
      console.log(`  ⚠️ ${t}: ${e.message.substring(0, 60)}`)
    }
  }
  
  // Also move sequences
  const sequences = await pool.query(`
    SELECT sequence_name FROM information_schema.sequences 
    WHERE sequence_schema = 'importexpress'
  `)
  
  for (const row of sequences.rows) {
    try {
      await pool.query(`ALTER SEQUENCE importexpress."${row.sequence_name}" SET SCHEMA public`)
      console.log(`  ✓ sequence ${row.sequence_name} → public`)
    } catch (e) {}
  }
  
  // Move indexes
  const indexes = await pool.query(`
    SELECT indexname FROM pg_indexes 
    WHERE schemaname = 'importexpress'
  `)
  
  for (const row of indexes.rows) {
    try {
      await pool.query(`ALTER INDEX importexpress."${row.indexname}" SET SCHEMA public`)
      console.log(`  ✓ index ${row.indexname} → public`)
    } catch (e) {}
  }
  
  // Verify
  const publicTables = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name
  `)
  console.log(`\n📊 Tablas en public: ${publicTables.rows.map(r => r.table_name).join(", ")}`)
  
  await pool.end()
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
