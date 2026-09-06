import fs from "fs"
import path from "path"

const BASE = "https://lopedis-lotenes.up.railway.app"
const BACKUP_DIR = path.join(process.env.HOME, "Desktop")
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)

async function getToken() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  const csrfData = await csrfRes.json()
  const csrfCookies = csrfRes.headers.getSetCookie?.() ?? []
  const cookieStr = csrfCookies.map(c => c.split(";")[0]).join("; ")

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieStr },
    body: JSON.stringify({
      csrfToken: csrfData.csrfToken,
      email: "lopedislotenes@admin.com",
      password: "elpiratad",
      callbackUrl: `${BASE}/admin`,
      json: true
    }),
    redirect: "manual",
  })

  const loginCookies = loginRes.headers.getSetCookie?.() ?? []
  const sessionCookie = loginCookies.find(c => c.includes("session-token"))
  if (!sessionCookie) throw new Error("No se pudo obtener sesión")
  return sessionCookie.split(";")[0]
}

async function fetchApi(token, path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: token } })
  if (!res.ok) { console.warn(`  ⚠️  ${path} → ${res.status}`); return null }
  return res.json()
}

async function main() {
  console.log("🔐 Obteniendo sesión de Railway...")
  const token = await getToken()
  console.log("✅ Sesión obtenida\n")

  console.log("📦 Descargando datos...")
  const [products, categories, stores, ordersRaw, bulks, transactions, settingsRaw, admins, heroes] = await Promise.all([
    fetchApi(token, "/api/productos?limit=10000"),
    fetchApi(token, "/api/categorias"),
    fetchApi(token, "/api/tiendas"),
    fetchApi(token, "/api/pedidos?limit=10000"),
    fetchApi(token, "/api/bultos?limit=10000"),
    fetchApi(token, "/api/transacciones?limit=10000"),
    fetchApi(token, "/api/configuracion"),
    fetchApi(token, "/api/admin/admins"),
    fetchApi(token, "/api/hero"),
  ])

  const pList = Array.isArray(products) ? products : products?.products || []
  const cList = Array.isArray(categories) ? categories : []
  const sList = Array.isArray(stores) ? stores : []
  const oList = Array.isArray(ordersRaw) ? ordersRaw : []
  const bList = Array.isArray(bulks) ? bulks : []
  const tList = Array.isArray(transactions) ? transactions : []
  const aList = Array.isArray(admins) ? admins : []
  const hList = Array.isArray(heroes) ? heroes : heroes?.banners || []

  console.log(`\n  Productos: ${pList.length}`)
  console.log(`  Categorías: ${cList.length}`)
  console.log(`  Tiendas: ${sList.length}`)
  console.log(`  Pedidos: ${oList.length}`)
  console.log(`  Bultos: ${bList.length}`)
  console.log(`  Transacciones: ${tList.length}`)
  console.log(`  Admins: ${aList.length}`)
  console.log(`  Hero Banners: ${hList.length}`)

  const backup = {
    timestamp: new Date().toISOString(),
    source: "Railway API",
    products: pList,
    categories: cList,
    stores: sList,
    orders: oList,
    bulks: bList,
    transactions: tList,
    admins: aList,
    heroBanners: hList,
    settings: settingsRaw,
  }

  const jsonPath = path.join(BACKUP_DIR, `importexpress-api-backup-${TIMESTAMP}.json`)
  fs.writeFileSync(jsonPath, JSON.stringify(backup, null, 2))
  const sizeMB = (fs.statSync(jsonPath).size / (1024 * 1024)).toFixed(2)
  
  console.log(`\n${"=".repeat(50)}`)
  console.log("💾 BACKUP COMPLETADO")
  console.log("=".repeat(50))
  console.log(`Archivo: ${jsonPath}`)
  console.log(`Tamaño: ${sizeMB} MB`)
  console.log(`Fecha: ${backup.timestamp}`)
  console.log("=".repeat(50))
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
