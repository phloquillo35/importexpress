// Health check: verificar que las URLs locales sigan accesibles en producción
import pg from "pg"
import https from "https"

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const BASE = "https://lopedis-lotenes.up.railway.app"

function checkUrl(u) {
  return new Promise((resolve) => {
    const req = https.get(u, (res) => {
      resolve({ url: u, status: res.statusCode, type: res.headers["content-type"] || "?" })
      res.resume()
    })
    req.on("error", () => resolve({ url: u, status: "ERR", type: "-" }))
    req.setTimeout(10000, () => {
      req.destroy()
      resolve({ url: u, status: "TIMEOUT", type: "-" })
    })
  })
}

async function main() {
  const prods = await pool.query(`SELECT images FROM "Product" WHERE images IS NOT NULL AND images != '[]'::jsonb`)
  const urls = new Set()
  for (const row of prods.rows) {
    const imgs = row.images
    if (!Array.isArray(imgs)) continue
    for (const img of imgs) {
      const u = typeof img === "string" ? img : img?.url
      if (u && u.includes("/api/uploads/")) urls.add(BASE + u)
    }
  }
  const heroes = await pool.query(`SELECT image FROM "HeroBanner" WHERE image IS NOT NULL AND image != ''`)
  for (const row of heroes.rows) {
    if (row.image.includes("/api/uploads/")) urls.add(BASE + row.image)
  }

  const sample = [...urls].slice(0, 15)
  const results = []
  for (const u of sample) results.push(await checkUrl(u))

  let ok = 0, fail = 0
  for (const r of results) {
    if (r.status === 200) ok++; else fail++
    console.log(`${r.status} ${r.type} ${r.url.split("/api/uploads/")[1]}`)
  }
  console.log("---")
  console.log(`OK: ${ok}  FAIL: ${fail}`)
  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
