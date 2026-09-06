import pg from "pg"
const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})

const slugs = [
  // JBL
  "jbl-charge-6-bluetooth", "jbl-flip-7", "jbl-vibe-beam2-perfect-fit-tws-bluetooth",
  "jbl-go-5", "jbl-clip-5-", "jbl-boombox-3", "jbl-partybox-club-120",
  "jbl-tune-t780nc-pure-bass", "jbl-endurance-run3-bluetooth-", "jbl-xtreme-4",
  // Xiaomi
  "xiaomi-redmi-buds-5-pro", "auricular-xiaomi-redmi-buds-6-play-m2420e1-wireless",
  "xiaomi-redmi-buds-8-lite-bluetooth", "smartwatch-xiaomi-watch-s4-m2502w1-41mm-negro",
  "reloj-inteligente-xiaomi-redmi-watch-5-active-m2351w1-midnight-negro",
  "xiaomi-15-5g-global-256gb-12gb-ram-dual-sim-pantalla-636",
  "xiaomi-redmi-note-14-5g-dual-sim-256gb-8gb-ram-de-667-5082mp-20mp",
  "tablet-xiaomi-pad-7-tela-11-wifi-256gb-8gb-ram",
  "reloj-inteligente-xiaomi-mi-smart-band10-m2459b1-",
  "monopatin-electrico-xiaomi-scooter-6-ultra-amarillo-ddhbc01xb"
]

async function main() {
  let totalProducts = 0
  let productsWithUniqueColors = 0
  let totalColors = 0
  let uniqueColors = 0
  let sameUrlIssues = 0

  for (const slug of slugs) {
    const result = await pool.query("SELECT images FROM public.product WHERE slug = $1", [slug])
    if (result.rows.length > 0) {
      const images = result.rows[0].images
      totalProducts++
      const urls = images.map(i => i.url)
      const uniqueUrls = new Set(urls)
      const colors = images.map(i => i.color).filter(c => c)
      
      console.log(`\n${slug}:`)
      console.log(`  Colors: ${colors.join(", ") || "(none)"}`)
      console.log(`  Total images: ${images.length}`)
      console.log(`  Unique URLs: ${uniqueUrls.size}`)
      
      if (uniqueUrls.size === images.length && images.length > 1) {
        productsWithUniqueColors++
        console.log(`  ✅ All unique URLs`)
      } else if (images.length === 1) {
        productsWithUniqueColors++
        console.log(`  ✅ Single color product`)
      } else {
        console.log(`  ❌ sameUrlAllColors issue: ${images.length - uniqueUrls.size} duplicates`)
        sameUrlIssues += images.length - uniqueUrls.size
      }
      
      totalColors += images.length
      uniqueColors += uniqueUrls.size
      
      // Show each color and URL
      for (const img of images) {
        console.log(`    ${img.color || "default"}: ${img.url}`)
      }
    } else {
      console.log(`\n${slug}: NOT FOUND`)
    }
  }

  console.log("\n=== SUMMARY ===")
  console.log(`Total products checked: ${totalProducts}`)
  console.log(`Products with unique colors: ${productsWithUniqueColors}`)
  console.log(`Total color entries: ${totalColors}`)
  console.log(`Unique URLs: ${uniqueColors}`)
  console.log(`sameUrlAllColors issues: ${sameUrlIssues}`)
  console.log(`Overall: ${sameUrlIssues === 0 ? "✅ PASS - 0 sameUrlAllColors issues" : "❌ FAIL - has sameUrlAllColors issues"}`)

  await pool.end()
}

main().catch(console.error)