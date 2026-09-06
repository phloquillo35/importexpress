import pg from "pg"
import fs from "fs"
import path from "path"

const DB_URL = "postgresql://postgres:hTJrkJMiURGuBheoZseuwNyraRPEiZlF@postgres.railway.internal:5432/railway"
const BACKUP_DIR = path.join(process.env.HOME, "Desktop")
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)

const { Pool } = pg
const pool = new Pool({ connectionString: DB_URL, connectionTimeoutMillis: 30000 })

async function main() {
  console.log("🔄 Conectando a la base de datos de Railway...")
  
  // Test connection
  const test = await pool.query("SELECT NOW()")
  console.log(`✅ Conexión exitosa: ${test.rows[0].now}`)
  
  // Get all tables
  console.log("\n📋 Obteniendo lista de tablas...")
  const tablesResult = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `)
  const tables = tablesResult.rows.map(r => r.table_name)
  console.log(`   Tablas encontradas: ${tables.length}`)
  
  // Backup each table
  const backup = {
    timestamp: new Date().toISOString(),
    database: "railway",
    tables: {}
  }
  
  let totalRows = 0
  
  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT * FROM "${table}"`)
      backup.tables[table] = result.rows
      totalRows += result.rows.length
      console.log(`   ✓ ${table}: ${result.rows.length} registros`)
    } catch (e) {
      console.log(`   ⚠️ ${table}: error - ${e.message}`)
      backup.tables[table] = { error: e.message }
    }
  }
  
  // Save JSON backup
  const jsonPath = path.join(BACKUP_DIR, `importexpress-full-backup-${TIMESTAMP}.json`)
  fs.writeFileSync(jsonPath, JSON.stringify(backup, null, 2))
  console.log(`\n💾 Backup JSON guardado: ${jsonPath}`)
  
  // Generate SQL dump
  let sql = `-- ImportExpress Database Backup\n-- Fecha: ${backup.timestamp}\n-- Tablas: ${tables.length}\n-- Registros totales: ${totalRows}\n\n`
  
  for (const table of tables) {
    if (backup.tables[table]?.error) continue
    const rows = backup.tables[table]
    if (!rows || !rows.length) continue
    
    sql += `-- Table: ${table} (${rows.length} rows)\n`
    sql += `TRUNCATE "${table}" CASCADE;\n`
    
    for (const row of rows) {
      const cols = Object.keys(row)
      const values = cols.map(col => {
        const v = row[col]
        if (v === null) return "NULL"
        if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`
        if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`
        return v
      })
      sql += `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(", ")}) VALUES (${values.join(", ")});\n`
    }
    sql += "\n"
  }
  
  const sqlPath = path.join(BACKUP_DIR, `importexpress-full-backup-${TIMESTAMP}.sql`)
  fs.writeFileSync(sqlPath, sql)
  console.log(`💾 Backup SQL guardado: ${sqlPath}`)
  
  // Summary
  console.log("\n" + "=".repeat(50))
  console.log("📊 RESUMEN DEL BACKUP")
  console.log("=".repeat(50))
  console.log(`Fecha: ${backup.timestamp}`)
  console.log(`Tablas: ${tables.length}`)
  console.log(`Registros totales: ${totalRows}`)
  console.log(`JSON: ${jsonPath} (${(fs.statSync(jsonPath).size / 1024).toFixed(1)} KB)`)
  console.log(`SQL: ${sqlPath} (${(fs.statSync(sqlPath).size / 1024).toFixed(1)} KB)`)
  console.log("=".repeat(50))
  
  await pool.end()
}

main().catch(e => { 
  console.error("❌ Error:", e.message)
  process.exit(1) 
})
