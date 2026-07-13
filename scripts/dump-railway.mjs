#!/usr/bin/env node
import pg from "pg"

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: false })
  const client = await pool.connect()

  const tables = ["Admin", "Category", "Distributor", "Product", "Bulk", "Order", "OrderItem", "Transaction", "Setting"]
  const result = {}

  for (const table of tables) {
    const res = await client.query(`SELECT * FROM "${table}" ORDER BY "id"`)
    result[table] = res.rows
  }

  console.log(JSON.stringify(result))
  client.release()
  await pool.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
