import pg from "pg"
import fs from "fs"
const { Pool } = pg

const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})

async function main() {
  try {
    const c4 = JSON.parse(fs.readFileSync("/tmp/c4-products.json", "utf8"))
    const detailed = []
    
    for (const p of c4) {
      const result = await pool.query("SELECT id, slug, name, specs, images FROM product WHERE slug = $1", [p.slug])
      if (result.rows.length > 0) {
        const row = result.rows[0]
        const images = row.images
        const urlsByColor = {}
        for (const img of images) {
          const color = (img.color || "").trim()
          if (!urlsByColor[color]) urlsByColor[color] = []
          urlsByColor[color].push(img.url)
        }
        detailed.push({
          id: row.id,
          slug: row.slug,
          name: row.name,
          imageCount: images.length,
          colors: Object.keys(urlsByColor),
          urlsByColor,
          hasCloudinary: images.some(i => i.url.includes("cloudinary")),
          hasSupabase: images.some(i => i.url.includes("supabase")),
          hasExternal: images.some(i => !i.url.includes("cloudinary") && !i.url.includes("supabase"))
        })
      }
    }
    
    fs.writeFileSync("/tmp/c4-detailed.json", JSON.stringify(detailed, null, 2))
    
    const cloudOnly = detailed.filter(p => p.hasCloudinary && !p.hasSupabase && !p.hasExternal)
    const supaOnly = detailed.filter(p => p.hasSupabase && !p.hasCloudinary && !p.hasExternal)
    const mixed = detailed.filter(p => (p.hasCloudinary && p.hasSupabase) || p.hasExternal)
    
    console.log("Cloudinary only:", cloudOnly.length)
    console.log("Supabase only:", supaOnly.length)
    console.log("Mixed/External:", mixed.length)
    
    for (const p of detailed) {
      console.log("")
      console.log("--- " + p.slug + " ---")
      console.log("  Colors:", p.colors.join(", "))
      console.log("  Sources: C=" + p.hasCloudinary + " S=" + p.hasSupabase + " E=" + p.hasExternal)
      for (const [color, urls] of Object.entries(p.urlsByColor)) {
        console.log("  [" + color + "]: " + urls.length + " URLs, first=" + urls[0].substring(0, 70))
      }
    }
  } catch (error) {
    console.error("Error:", error.message)
  } finally {
    await pool.end()
  }
}

main()
