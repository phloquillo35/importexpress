// Limpieza de trailing spaces en nombres de categorías
// Uso:
//   node scripts/limpiar-trailing-spaces.mjs --dry-run   (lista qué haría, NO toca DB)
//   node scripts/limpiar-trailing-spaces.mjs             (ejecuta con transacción + backup)
//
// Requiere env var DATABASE_URL (pública de Railway: reseau.proxy.rlwy.net)
import pg from "pg"
import fs from "fs"

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const DRY_RUN = process.argv.includes("--dry-run")

async function main() {
  if (DRY_RUN) console.log("🧪 DRY RUN — no se modifica nada\n")

  // 1. Afectadas: name con espacios al inicio o final
  const afectadas = await pool.query(`
    SELECT id, name, slug, "deletedAt" FROM "Category"
    WHERE name != TRIM(name)
    ORDER BY name
  `)
  console.log(`Categorías con trailing/leading spaces: ${afectadas.rows.length}`)
  for (const r of afectadas.rows) {
    console.log(`  "${r.name}" → "${r.name.trim()}" (${r.id.slice(0, 8)}, ${r.deletedAt ? "BORRADA" : "activa"})`)
  }

  // 2. Chequear colisiones: si DOS afectadas quedaran con el mismo nombre tras el TRIM
  //    (colisiones pre-existentes con no-afectadas son legítimas: marcas por segmento)
  const nombres = afectadas.rows.map((r) => r.name.trim().toUpperCase())
  const dups = nombres.filter((n, i) => nombres.indexOf(n) !== i)
  if (dups.length > 0) {
    console.log("\n⚠️ EL TRIM CREARÍA DUPLICADOS (abortar): " + [...new Set(dups)].join(", "))
    await pool.end()
    return
  }

  if (DRY_RUN) {
    console.log("\n🧪 DRY RUN completo — no se ejecutó nada")
    await pool.end()
    return
  }

  // 3. Backup JSON
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const backupFile = `backup-trailing-spaces-${ts}.json`
  fs.writeFileSync(backupFile, JSON.stringify({ fecha: new Date().toISOString(), categorias: afectadas.rows }, null, 2))
  console.log(`\n💾 Backup → ${backupFile}`)

  // 4. Transacción
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const res = await client.query(
      `UPDATE "Category" SET name = TRIM(name), "updatedAt" = now() WHERE name != TRIM(name) RETURNING id, name`
    )
    console.log(`✅ TRIM aplicado a ${res.rowCount} categorías`)
    for (const r of res.rows) console.log(`   → "${r.name}" (${r.id.slice(0, 8)})`)
    await client.query("COMMIT")
    console.log("🎉 Transacción COMMITeada")
  } catch (e) {
    await client.query("ROLLBACK")
    console.error("\n❌ Error — ROLLBACK ejecutado, DB intacta")
    throw e
  } finally {
    client.release()
  }

  // 5. Verificación
  const restantes = await pool.query(`SELECT COUNT(*) FROM "Category" WHERE name != TRIM(name)`)
  console.log(`\n🔍 Verificación: categorías con spaces restantes: ${restantes.rows[0].count}`)
  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
