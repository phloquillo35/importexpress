// Diagnóstico de la tabla Category — solo LECTURA
// Uso: node scripts/diag-categorias.mjs
// Requiere env var DATABASE_URL (pública de Railway: reseau.proxy.rlwy.net)
import pg from "pg"

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  // 1. TODAS las categorías con conteo de productos activos
  const cats = await pool.query(`
    SELECT c.id, c.name, c.slug, c."parentId", c."deletedAt",
      COUNT(p.id) FILTER (WHERE p."deletedAt" IS NULL) AS prod_activos,
      COUNT(p.id) FILTER (WHERE p."deletedAt" IS NOT NULL) AS prod_borrados
    FROM "Category" c
    LEFT JOIN "Product" p ON p."categoryId" = c.id
    GROUP BY c.id, c.name, c.slug, c."parentId", c."deletedAt"
    ORDER BY c."parentId" IS NOT NULL, c."deletedAt" IS NOT NULL, c.name
  `)

  console.log("=== CATEGORÍAS (" + cats.rows.length + " totales) ===")
  for (const r of cats.rows) {
    const estado = r.deletedAt ? "BORRADA" : "activa"
    const padre = r.parentId ? r.parentId.slice(0, 8) : "RAÍZ"
    console.log(
      `${r.id.slice(0, 8)} | ${r.name.padEnd(28)} | slug=${r.slug.padEnd(22)} | padre=${padre.padEnd(10)} | ${estado.padEnd(8)} | prod_act=${r.prod_activos} prod_borr=${r.prod_borrados}`
    )
  }

  // 2. Duplicados por nombre normalizado (UPPER, sin espacios)
  console.log("\n=== DUPLICADOS POR NOMBRE NORMALIZADO ===")
  const dups = await pool.query(`
    SELECT UPPER(TRIM(name)) AS nombre, COUNT(*) AS cantidad,
      array_agg(id ORDER BY id) AS ids
    FROM "Category"
    GROUP BY UPPER(TRIM(name))
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `)
  for (const r of dups.rows) {
    console.log(`${r.nombre} (${r.cantidad}): ${r.ids.map((x) => x.slice(0, 8)).join(", ")}`)
  }

  // 3. Huérfanas: hijas cuyo padre fue borrado o no existe
  console.log("\n=== HUÉRFANAS (padre borrado o inexistente) ===")
  const orphans = await pool.query(`
    SELECT c.id, c.name, c.slug, c."parentId"
    FROM "Category" c
    LEFT JOIN "Category" p ON p.id = c."parentId"
    WHERE c."parentId" IS NOT NULL AND (p.id IS NULL OR p."deletedAt" IS NOT NULL)
  `)
  for (const r of orphans.rows) {
    console.log(`${r.id.slice(0, 8)} | ${r.name} | padre=${r.parentId ? r.parentId.slice(0, 8) : "NULL"}`)
  }

  // 4. Productos activos sin categoría válida
  console.log("\n=== PRODUCTOS ACTIVOS SIN CATEGORÍA VÁLIDA ===")
  const prods = await pool.query(`
    SELECT p.id, p.name, p.slug, p."categoryId"
    FROM "Product" p
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    WHERE p."deletedAt" IS NULL AND (p."categoryId" IS NULL OR c."deletedAt" IS NOT NULL)
  `)
  for (const r of prods.rows) {
    console.log(`${r.id.slice(0, 8)} | ${r.name.slice(0, 60)} | cat=${r.categoryId ? r.categoryId.slice(0, 8) : "NULL"}`)
  }
  console.log(`(total: ${prods.rows.length})`)

  // 5. Resumen
  const resumen = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE "deletedAt" IS NULL) AS activas,
      COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) AS borradas,
      COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND "parentId" IS NULL) AS raices_activas,
      COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND "parentId" IS NOT NULL) AS hijas_activas
    FROM "Category"
  `)
  console.log("\n=== RESUMEN ===")
  console.log(JSON.stringify(resumen.rows[0], null, 2))

  const prodAct = await pool.query(`SELECT COUNT(*) FROM "Product" WHERE "deletedAt" IS NULL`)
  console.log("Productos activos totales:", prodAct.rows[0].count)

  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
