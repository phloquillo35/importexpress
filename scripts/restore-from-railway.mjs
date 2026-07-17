#!/usr/bin/env node
import Database from "better-sqlite3"
import { randomUUID } from "crypto"
import fs from "fs"

const RAILWAY_URL = "https://importexpress-production.up.railway.app"
const DB_PATH = "./prisma/dev.db"
const TOKEN_FILE = "/tmp/railway-session.txt"

async function getToken() {
  // Try reading saved token first
  if (fs.existsSync(TOKEN_FILE)) {
    const saved = fs.readFileSync(TOKEN_FILE, "utf-8").trim()
    const testRes = await fetch(`${RAILWAY_URL}/api/productos?limit=1`, { headers: { Cookie: saved } })
    if (testRes.ok) {
      console.log("  ✓ Usando sesión guardada")
      return saved
    }
    console.log("  ⚠️  Sesión guardada expiró, renovando...")
  }

  const EMAIL = process.env.RAILWAY_EMAIL || "lopedislotenes@admin.com"
  const PASSWORD = process.env.RAILWAY_PASSWORD || "elpiratad"

  const csrfRes = await fetch(`${RAILWAY_URL}/api/auth/csrf`)
  const csrfData = await csrfRes.json()
  const csrfCookies = csrfRes.headers.getSetCookie?.() ?? []
  const cookieStr = csrfCookies.map(c => c.split(";")[0]).join("; ")

  const loginRes = await fetch(`${RAILWAY_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieStr, "x-forwarded-for": `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` },
    body: JSON.stringify({ csrfToken: csrfData.csrfToken, email: EMAIL, password: PASSWORD, callbackUrl: `${RAILWAY_URL}/admin`, json: true }),
    redirect: "manual",
  })

  if (loginRes.status === 429) {
    console.error("  ✗ Rate limited. Esperá 15 min o usá credenciales distintas.")
    console.error("    Podés pasar la cookie manualmente:")
    console.error("    railway session-token=... node scripts/restore-from-railway.mjs")
    const body = await loginRes.text()
    console.error("    Respuesta:", body.substring(0, 200))
    process.exit(1)
  }

  const loginCookies = loginRes.headers.getSetCookie?.() ?? []
  const sessionCookie = loginCookies.find(c => c.includes("session-token"))
  if (!sessionCookie) {
    console.error("  ✗ No se pudo obtener sesión. Verificá email/contraseña en Railway.")
    process.exit(1)
  }

  const token = sessionCookie.split(";")[0]
  fs.writeFileSync(TOKEN_FILE, token)
  console.log("  ✓ Sesión nueva guardada")
  return token
}

async function fetchApi(token, path) {
  const res = await fetch(`${RAILWAY_URL}${path}`, { headers: { Cookie: token } })
  if (!res.ok) { console.warn(`  ⚠️  ${path} → ${res.status}`); return null }
  return res.json()
}

async function main() {
  // Allow passing cookie directly: SESSION_COOKIE="..." node script.mjs
  let token = process.env.SESSION_COOKIE || process.argv[2]
  if (!token) {
    console.log("\n🔐 Obteniendo sesión de Railway...")
    token = await getToken()
  }

  console.log("\n📦 Descargando datos...")
  const [products, categories, stores, ordersRaw, bulks, transactions, settingsRaw, admins] = await Promise.all([
    fetchApi(token, "/api/productos?limit=10000"),
    fetchApi(token, "/api/categorias"),
    fetchApi(token, "/api/tiendas"),
    fetchApi(token, "/api/pedidos?limit=10000"),
    fetchApi(token, "/api/bultos?limit=10000"),
    fetchApi(token, "/api/transacciones?limit=10000"),
    fetchApi(token, "/api/configuracion"),
    fetchApi(token, "/api/admin/admins"),
  ])

  const pList = Array.isArray(products) ? products : products?.products || []
  const cList = Array.isArray(categories) ? categories : []
  const sList = Array.isArray(stores) ? stores : []
  const oList = Array.isArray(ordersRaw) ? ordersRaw : []
  const bList = Array.isArray(bulks) ? bulks : []
  const tList = Array.isArray(transactions) ? transactions : []
  const aList = Array.isArray(admins) ? admins : []

  console.log(`\n  Productos: ${pList.length}`)
  console.log(`  Categorías: ${cList.length}`)
  console.log(`  Tiendas: ${sList.length}`)
  console.log(`  Pedidos: ${oList.length}`)
  console.log(`  Bultos: ${bList.length}`)
  console.log(`  Transacciones: ${tList.length}`)
  console.log(`  Admins: ${aList.length}`)

  if (!oList.length && !pList.length) {
    console.log("\n❌ No se obtuvieron datos. Revisá la sesión o credenciales.")
    process.exit(1)
  }

  console.log("\n💾 Insertando en base local...")
  const db = new Database(DB_PATH)
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = OFF")

  const insertAll = db.transaction(() => {
    db.exec(`DELETE FROM "OrderItem"`)
    db.exec(`DELETE FROM "Order"`)
    db.exec(`DELETE FROM "Bulk"`)
    db.exec(`DELETE FROM "Transaction"`)
    db.exec(`DELETE FROM "Product"`)
    db.exec(`DELETE FROM "Distributor"`)
    db.exec(`DELETE FROM "Category"`)
    db.exec(`DELETE FROM "Setting"`)
    db.exec(`DELETE FROM "Admin"`)

    function insertSafe(table, rows, skipKeys = []) {
      if (!rows.length) return
      const columns = Object.keys(rows[0]).filter(c => !skipKeys.includes(c))
      const placeholders = columns.map(() => "?").join(",")
      const cols = columns.map(c => `"${c}"`).join(",")
      const stmt = db.prepare(`INSERT INTO "${table}" (${cols}) VALUES (${placeholders})`)
      let count = 0
      for (const row of rows) {
        const vals = columns.map(c => {
          let v = row[c]
          if (v === undefined || v === null) return null
          if (typeof v === "object" && !(v instanceof Date)) return JSON.stringify(v)
          return v
        })
        try { stmt.run(...vals); count++ } catch (e) { /* skip duplicates */ }
      }
      console.log(`  ✓ ${count} → ${table}`)
    }

    if (aList.length) insertSafe("Admin", aList)
    else insertSafe("Admin", [{
      id: randomUUID(), email: "lopedislotenes@admin.com", name: "Admin",
      password: "$2a$10$dummy", role: "admin",
    }])

    insertSafe("Category", cList)
    insertSafe("Distributor", sList)
    insertSafe("Product", pList)
    insertSafe("Bulk", bList)

    const orderItems = []
    const ordersClean = []
    for (const o of oList) {
      const items = o.items || []
      for (const item of items) {
        const itemClean = { ...item }
        delete itemClean.product
        delete itemClean.bulk
        itemClean.orderId = o.id
        orderItems.push(itemClean)
      }
      const orderClean = { ...o }
      delete orderClean.items
      delete orderClean.store
      ordersClean.push(orderClean)
    }
    insertSafe("Order", ordersClean)
    insertSafe("OrderItem", orderItems)
    insertSafe("Transaction", tList)

    if (settingsRaw && typeof settingsRaw === "object") {
      const rows = Object.entries(settingsRaw).map(([key, value]) => ({ id: key, key, value: String(value) }))
      insertSafe("Setting", rows)
    }
  })

  try { insertAll() } catch (e) { console.error("Error:", e.message) }

  db.pragma("foreign_keys = ON")
  db.close()
  console.log("\n✅ Restauración completada")
}

main().catch(err => { console.error("\n❌ Error:", err.message); process.exit(1) })
