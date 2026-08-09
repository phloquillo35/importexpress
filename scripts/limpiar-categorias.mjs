// Limpieza de categorías huérfanas + typos + producto sin categoría
// Uso:
//   node scripts/limpiar-categorias.mjs --dry-run   (lista qué haría, NO toca DB)
//   node scripts/limpiar-categorias.mjs             (ejecuta con transacción + backup)
//
// Requiere env var DATABASE_URL (pública de Railway: reseau.proxy.rlwy.net)
//
// Operaciones (aprobadas por Nico 09/08/2026):
//   1. Soft-delete 4 huérfanas de RELOJ/SMARTWATCH (padre borrado, 0 productos)
//      → quedan en la papelera (deletedAt), 0 impacto en UI pública
//   2. Rename 3 typos (solo name, NO slug — el slug es unique y las URLs dependen de él)
//   3. Reasignar 1 producto activo sin categoría → NOTEBOOK Y COMPUTADORAS
import pg from "pg"
import fs from "fs"

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const DRY_RUN = process.argv.includes("--dry-run")

// Identificadores por SLUG (unique en schema) — robusto a cambios de ID
const SLUGS_HUERFANAS = [
  "reloj-smartwatch-apple",   // APPLE   → duplicada de smartwatch-apple (79947a75)
  "reloj-smartwatch-xiaomi",  // XIAOMI  → duplicada de smartwatch-xioami (ca2521ae)
  "reloj-smartwatch-garmin",  // GARMIN  → duplicada de smartwatch-garmin (7e56fe25)
  "reloj-smartwatch-casio",   // CASIO   → única, 0 productos, padre borrado
]

const RENAMES = [
  { slug: "smartwatch-xioami", nuevoName: "XIAOMI" },        // typo "Xioami"
  { slug: "tablet-xioami", nuevoName: "XIAOMI" },            // typo "XIOAMI"
  { slug: "notebook-y-computadoras", nuevoName: "NOTEBOOK Y COMPUTADORAS" }, // doble espacio
]

const SLUG_NOTEBOOK = "notebook-y-computadoras"
const PRODUCTO_ID_PREFIX = "8b211c99" // Notebook HP — producto activo sin categoría

async function main() {
  if (DRY_RUN) console.log("🧪 DRY RUN — no se modifica nada\n")

  // ── Resolver IDs completos por slug ────────────────────────────────
  const idsHuerfanas = []
  for (const slug of SLUGS_HUERFANAS) {
    const r = await pool.query(`SELECT id, name, slug, "deletedAt" FROM "Category" WHERE slug = $1`, [slug])
    if (r.rows.length === 0) { console.log(`⚠️ No existe categoría con slug ${slug} — se omite`); continue }
    const row = r.rows[0]
    idsHuerfanas.push({ id: row.id, name: row.name, slug: row.slug, yaBorrada: !!row.deletedAt })
  }

  const catNotebook = (await pool.query(`SELECT id, name FROM "Category" WHERE slug = $1`, [SLUG_NOTEBOOK])).rows[0]
  const producto = (await pool.query(
    `SELECT id, name, slug, "categoryId" FROM "Product" WHERE id LIKE $1 AND "deletedAt" IS NULL`, [PRODUCTO_ID_PREFIX + "%"]
  )).rows[0]

  const renameResolved = []
  for (const r of RENAMES) {
    const row = (await pool.query(`SELECT id, name FROM "Category" WHERE slug = $1`, [r.slug])).rows[0]
    if (!row) { console.log(`⚠️ No existe categoría con slug ${r.slug} — se omite`); continue }
    renameResolved.push({ id: row.id, nameViejo: row.name, nuevoName: r.nuevoName, slug: r.slug })
  }

  // ── Backup JSON (siempre, incluso en dry-run) ──────────────────────
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const backup = {
    fecha: new Date().toISOString(),
    huerfanas: [],
    renames: [],
    producto: null,
  }
  for (const h of idsHuerfanas) {
    const full = (await pool.query(`SELECT * FROM "Category" WHERE id = $1`, [h.id])).rows[0]
    backup.huerfanas.push(full)
  }
  for (const r of renameResolved) {
    const full = (await pool.query(`SELECT * FROM "Category" WHERE id = $1`, [r.id])).rows[0]
    backup.renames.push(full)
  }
  if (producto) backup.producto = (await pool.query(`SELECT * FROM "Product" WHERE id = $1`, [producto.id])).rows[0]
  const backupFile = `backup-limpieza-categorias-${ts}.json`
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))
  console.log(`💾 Backup → ${backupFile}`)

  // ── Plan ───────────────────────────────────────────────────────────
  console.log("\n📋 PLAN:")
  for (const h of idsHuerfanas) {
    console.log(`  SOFT-DELETE ${h.slug} (${h.name}) ${h.yaBorrada ? "— YA BORRADA, se omite" : ""}`)
  }
  for (const r of renameResolved) {
    console.log(`  RENAME "${r.nameViejo}" → "${r.nuevoName}" (slug ${r.slug})`)
  }
  if (producto) console.log(`  REASIGNAR "${producto.name.slice(0, 50)}..." → cat ${catNotebook.name}`)

  if (DRY_RUN) {
    console.log("\n🧪 DRY RUN completo — no se ejecutó nada")
    await pool.end()
    return
  }

  // ── Transacción ────────────────────────────────────────────────────
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // 1. Soft-delete huérfanas (solo las que no están ya borradas)
    for (const h of idsHuerfanas) {
      if (h.yaBorrada) continue
      const r = await client.query(
        `UPDATE "Category" SET "deletedAt" = now(), "updatedAt" = now() WHERE id = $1 RETURNING id`, [h.id]
      )
      console.log(`✅ Soft-deleted ${h.slug}: ${r.rowCount} fila`)
    }

    // 2. Renames
    for (const r of renameResolved) {
      const res = await client.query(
        `UPDATE "Category" SET name = $1, "updatedAt" = now() WHERE id = $2 RETURNING name`, [r.nuevoName, r.id]
      )
      console.log(`✅ Renamed ${r.slug}: "${res.rows[0].name}"`)
    }

    // 3. Reasignar producto
    if (producto) {
      const res = await client.query(
        `UPDATE "Product" SET "categoryId" = $1, "updatedAt" = now() WHERE id = $2 RETURNING id`, [catNotebook.id, producto.id]
      )
      console.log(`✅ Producto ${producto.id.slice(0, 8)} → categoría ${catNotebook.name} (${res.rowCount} fila)`)
    }

    await client.query("COMMIT")
    console.log("\n🎉 Transacción COMMITeada")
  } catch (e) {
    await client.query("ROLLBACK")
    console.error("\n❌ Error — ROLLBACK ejecutado, DB intacta")
    throw e
  } finally {
    client.release()
  }

  // ── Verificación post ──────────────────────────────────────────────
  await verificar()
  await pool.end()
}

async function verificar() {
  console.log("\n🔍 VERIFICACIÓN POST-LIMPIEZA:")
  const huérfanas = await pool.query(`
    SELECT c.id, c.name, c.slug FROM "Category" c
    LEFT JOIN "Category" p ON p.id = c."parentId"
    WHERE c."parentId" IS NOT NULL AND c."deletedAt" IS NULL AND (p.id IS NULL OR p."deletedAt" IS NOT NULL)
  `)
  console.log(`  Categorías huérfanas activas: ${huérfanas.rows.length}`)

  const sinCat = await pool.query(`
    SELECT COUNT(*) FROM "Product" p
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    WHERE p."deletedAt" IS NULL AND (p."categoryId" IS NULL OR c."deletedAt" IS NOT NULL)
  `)
  console.log(`  Productos activos sin categoría válida: ${sinCat.rows[0].count}`)

  const resumen = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE "deletedAt" IS NULL) AS activas,
      COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) AS borradas
    FROM "Category"
  `)
  console.log(`  Categorías: ${resumen.rows[0].activas} activas + ${resumen.rows[0].borradas} borradas`)

  const prodAct = await pool.query(`SELECT COUNT(*) FROM "Product" WHERE "deletedAt" IS NULL`)
  console.log(`  Productos activos: ${prodAct.rows[0].count}`)

  const nombreXioami = await pool.query(`SELECT name, slug FROM "Category" WHERE slug IN ('smartwatch-xioami','tablet-xioami')`)
  for (const r of nombreXioami.rows) console.log(`  Nombre actualizado: ${r.slug} → "${r.name}"`)
}

main().catch((e) => { console.error(e); process.exit(1) })
