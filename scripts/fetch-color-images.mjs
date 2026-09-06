import pg from "pg"
import sharp from "sharp"
import { createClient } from "@supabase/supabase-js"
import https from "https"
import http from "http"

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ANGLES = ["front", "left", "right"]
const DELAY = 500

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function cleanName(name) {
  return name
    .replace(/\b(Negro|Blanco|Gris|Azul|Rojo|Verde|Pink|Black|White|Gray|Blue|Red|Green|Gold|Silver|Rose|Clear|Transparent)\b/gi, "")
    .replace(/\b\d+(\.\d+)?\s*(gb|mb|tb|ml|l|kg|wh|hz|inch|pulgadas?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
}

async function searchImage(query) {
  try {
    const encoded = encodeURIComponent(query)
    const url = `https://duckduckgo.com/?q=${encoded}&iarx=images&iax=images&ia=images`
    
    const res = await fetch(`https://duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`)
    const data = await res.json()
    
    if (data.AbstractImage?.src) return data.AbstractImage.src
    
    const imgRes = await fetch(`https://duckduckgo.com/?q=${encoded}&iax=images&ia=images&format=json`)
    const imgData = await imgRes.json()
    
    if (imgData.results?.[0]?.image) return imgData.results[0].image
    if (imgData.results?.[0]?.thumbnail) return imgData.results[0].thumbnail
    
    return null
  } catch (e) {
    return null
  }
}

async function fetchUrl(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http
    const req = protocol.get(url, { timeout, headers: { "User-Agent": "Mozilla/5.0" } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, timeout).then(resolve, reject)
      }
      const chunks = []
      res.on("data", c => chunks.push(c))
      res.on("end", () => resolve(Buffer.concat(chunks)))
      res.on("error", reject)
    })
    req.on("error", reject)
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")) })
  })
}

async function processImage(buffer) {
  try {
    return await sharp(buffer)
      .resize(800, 800, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 90 })
      .toBuffer()
  } catch {
    return null
  }
}

async function uploadToStorage(path, buffer) {
  const { error } = await supabase.storage
    .from("products")
    .upload(path, buffer, { contentType: "image/png", upsert: true })
  return !error
}

async function main() {
  console.log("=== S2: Fetch Color-Variant Images ===\n")

  const products = await pool.query(`
    SELECT id, slug, name, images
    FROM public.product
    WHERE images != '[]'::jsonb AND images IS NOT NULL
  `)

  let totalUploaded = 0
  let totalFailed = 0

  for (const row of products.rows) {
    const images = row.images
    if (!Array.isArray(images)) continue
    const colors = [...new Set(images.map(i => i.color).filter(Boolean))]
    if (colors.length === 0) continue

    console.log(`\nProduct: ${row.slug}`)
    console.log(`  Colors: ${colors.join(", ")}`)

    const clean = cleanName(row.name)
    const newImages = []

    for (const color of colors) {
      console.log(`  Color: ${color}`)

      for (const angle of ANGLES) {
        const searchQuery = `${clean} ${color} ${angle === "front" ? "product" : angle + " side view"}`
        console.log(`    Searching: ${searchQuery}`)

        const imageUrl = await searchImage(searchQuery)
        if (!imageUrl) {
          console.log(`    No image found for ${angle}`)
          totalFailed++
          continue
        }

        try {
          const buffer = await fetchUrl(imageUrl)
          const processed = await processImage(buffer)
          if (!processed) {
            console.log(`    Failed to process image`)
            totalFailed++
            continue
          }

          const path = `products/${row.slug}/${color}/${angle}.png`
          const uploaded = await uploadToStorage(path, processed)
          if (!uploaded) {
            console.log(`    Failed to upload`)
            totalFailed++
            continue
          }

          const publicUrl = `https://vxttpffxhyrdeawjypks.supabase.co/storage/v1/object/public/products/${path}`
          newImages.push({ url: publicUrl, color })
          totalUploaded++
          console.log(`    Uploaded: ${angle}.png`)
        } catch (e) {
          console.log(`    Error: ${e.message}`)
          totalFailed++
        }

        await sleep(DELAY)
      }
    }

    // Update database with new images (keep old ones too)
    const existingImages = images.filter(i => !colors.includes(i.color))
    const allImages = [...existingImages, ...newImages]
    
    await pool.query(
      "UPDATE public.product SET images = $1 WHERE id = $2",
      [JSON.stringify(allImages), row.id]
    )
    console.log(`  Updated DB: ${allImages.length} images`)
  }

  console.log(`\n=== Results ===`)
  console.log(`Uploaded: ${totalUploaded}`)
  console.log(`Failed: ${totalFailed}`)

  await pool.end()
}

main().catch(e => { console.error("Error:", e.message); process.exit(1) })
