#!/usr/bin/env node
import Database from "better-sqlite3"
import pg from "pg"

const SQLITE_PATH = "/data/prisma/dev.db"
const MARKER = "/data/prisma/.migrated-to-pg"

async function main() {
  if (process.env.DATABASE_URL?.startsWith("file:")) {
    console.log("→ Aún en SQLite, no hay Postgres configurado. Omitiendo migración de datos.")
    return
  }

  if (!process.env.DATABASE_URL) {
    console.log("→ DATABASE_URL no configurada. Omitiendo migración de datos.")
    return
  }

  const fs = await import("fs")
  if (fs.existsSync(MARKER)) {
    console.log("→ Datos ya migrados a PostgreSQL.")
    return
  }

  const sqlitePath = SQLITE_PATH
  if (!fs.existsSync(sqlitePath)) {
    console.log("→ No se encontró base SQLite para migrar.")
    return
  }

  console.log("→ Migrando datos de SQLite a PostgreSQL...")

  const sqlite = new Database(sqlitePath)
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

  try {
    const models = [
      "Admin",
      "Setting",
      "Category",
      "Distributor",
      "Bulk",
      "Product",
      "Order",
      "OrderItem",
      "Transaction",
    ]

    for (const table of models) {
      const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all()
      if (rows.length === 0) {
        console.log(`  ${table}: 0 filas (vacío)`)
        continue
      }

      for (const row of rows) {
        const columns = Object.keys(row)
        const values = Object.values(row)
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ")
        const cols = columns.map((c) => `"${c}"`).join(", ")

        try {
          await pool.query(
            `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) ON CONFLICT ("id") DO NOTHING`,
            values
          )
        } catch (err) {
          console.error(`  Error insertando en ${table}: ${err.message}`)
        }
      }

      console.log(`  ${table}: ${rows.length} filas migradas`)
    }

    fs.writeFileSync(MARKER, new Date().toISOString())
    console.log("✓ Migración de datos completada.")
  } finally {
    sqlite.close()
    await pool.end()
  }
}

main().catch((err) => {
  console.error("Error en migración:", err)
  process.exit(0)
})