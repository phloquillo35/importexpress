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

async function fetchAllPages(token, apiPath, limit = 100) {
  try {
    const firstRes = await fetch(`${BASE}${apiPath}?limit=${limit}&page=1`, { headers: { Cookie: token } })
    if (!firstRes.ok) { console.warn(`  ⚠️  ${apiPath} → ${firstRes.status}`); return [] }
    const firstData = await firstRes.json()
    
    // Handle different response formats
    let items = []
    if (Array.isArray(firstData)) {
      items = firstData
    } else if (firstData.products) {
      items = firstData.products
    } else if (firstData.orders) {
      items = firstData.orders
    } else if (firstData.bulks) {
      items = firstData.bulks
    } else if (firstData.transactions) {
      items = firstData.transactions
    } else {
      // Try to find any array in the response
      for (const key of Object.keys(firstData)) {
        if (Array.isArray(firstData[key])) {
          items = firstData[key]
          break
        }
      }
    }
    
    const total = firstData.total || items.length
    const totalPages = Math.ceil(total / limit)
    
    let allItems = [...items]
    
    for (let p = 2; p <= totalPages; p++) {
      const res = await fetch(`${BASE}${apiPath}?limit=${limit}&page=${p}`, { headers: { Cookie: token } })
      if (res.ok) {
        const data = await res.json()
        let pageItems = []
        if (Array.isArray(data)) {
          pageItems = data
        } else if (data.products) {
          pageItems = data.products
        } else if (data.orders) {
          pageItems = data.orders
        } else if (data.bulks) {
          pageItems = data.bulks
        } else if (data.transactions) {
          pageItems = data.transactions
        } else {
          for (const key of Object.keys(data)) {
            if (Array.isArray(data[key])) {
              pageItems = data[key]
              break
            }
          }
        }
        allItems = allItems.concat(pageItems)
      }
    }
    
    return allItems
  } catch (e) {
    console.warn(`  ⚠️  ${apiPath}: ${e.message}`)
    return []
  }
}

async function fetchApi(token, apiPath) {
  const res = await fetch(`${BASE}${apiPath}`, { headers: { Cookie: token } })
  if (!res.ok) { console.warn(`  ⚠️  ${apiPath} → ${res.status}`); return null }
  return res.json()
}

async function main() {
  console.log("🔐 Obteniendo sesión de Railway...")
  const token = await getToken()
  console.log("✅ Sesión obtenida\n")

  console.log("📦 Descargando TODOS los datos...")
  
  const products = await fetchAllPages(token, "/api/productos", 100)
  console.log(`  ✓ Productos: ${products.length}`)
  
  const categories = await fetchApi(token, "/api/categorias")
  const cList = Array.isArray(categories) ? categories : []
  console.log(`  ✓ Categorías: ${cList.length}`)
  
  const stores = await fetchApi(token, "/api/tiendas")
  const sList = Array.isArray(stores) ? stores : []
  console.log(`  ✓ Tiendas: ${sList.length}`)
  
  const orders = await fetchAllPages(token, "/api/pedidos", 100)
  console.log(`  ✓ Pedidos: ${orders.length}`)
  
  const bulks = await fetchAllPages(token, "/api/bultos", 100)
  console.log(`  ✓ Bultos: ${bulks.length}`)
  
  const transactions = await fetchAllPages(token, "/api/transacciones", 100)
  console.log(`  ✓ Transacciones: ${transactions.length}`)
  
  const admins = await fetchApi(token, "/api/admin/admins")
  const aList = Array.isArray(admins) ? admins : []
  console.log(`  ✓ Admins: ${aList.length}`)
  
  const heroes = await fetchApi(token, "/api/hero")
  const hList = Array.isArray(heroes) ? heroes : heroes?.banners || []
  console.log(`  ✓ Hero Banners: ${hList.length}`)

  const settings = await fetchApi(token, "/api/configuracion")
  console.log(`  ✓ Configuración: ${settings ? 'OK' : 'N/A'}`)

  const backup = {
    timestamp: new Date().toISOString(),
    source: "Railway API - Full Backup",
    counts: {
      products: products.length,
      categories: cList.length,
      stores: sList.length,
      orders: orders.length,
      bulks: bulks.length,
      transactions: transactions.length,
      admins: aList.length,
      heroBanners: hList.length,
    },
    products,
    categories: cList,
    stores: sList,
    orders,
    bulks,
    transactions,
    admins: aList,
    heroBanners: hList,
    settings,
  }

  const jsonPath = path.join(BACKUP_DIR, `importexpress-FULL-backup-${TIMESTAMP}.json`)
  fs.writeFileSync(jsonPath, JSON.stringify(backup, null, 2))
  const sizeMB = (fs.statSync(jsonPath).size / (1024 * 1024)).toFixed(2)
  
  console.log(`\n${"=".repeat(50)}`)
  console.log("💾 BACKUP COMPLETO FINALIZADO")
  console.log("=".repeat(50))
  console.log(`Archivo: ${jsonPath}`)
  console.log(`Tamaño: ${sizeMB} MB`)
  console.log(`Fecha: ${backup.timestamp}`)
  console.log("\n📊 RESUMEN:")
  console.log(`  Productos: ${products.length}`)
  console.log(`  Categorías: ${cList.length}`)
  console.log(`  Tiendas: ${sList.length}`)
  console.log(`  Pedidos: ${orders.length}`)
  console.log(`  Bultos: ${bulks.length}`)
  console.log(`  Transacciones: ${transactions.length}`)
  console.log(`  Admins: ${aList.length}`)
  console.log(`  Hero Banners: ${hList.length}`)
  console.log("=".repeat(50))
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
