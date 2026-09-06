import pg from "pg"
import sharp from "sharp"
import { createClient } from "@supabase/supabase-js"

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
const DELAY = 300

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// Extract image URLs from HTML
function extractImageUrls(html, baseUrl) {
  const urls = new Set()
  // Match img src, data-src, data-original, etc.
  const patterns = [
    /src=["']([^"']+\.(?:jpg|jpeg|png|webp|avif)[^"']*)["']/gi,
    /data-src=["']([^"']+\.(?:jpg|jpeg|png|webp|avif)[^"']*)["']/gi,
    /data-original=["']([^"']+\.(?:jpg|jpeg|png|webp|avif)[^"']*)["']/gi,
    /background-image:\s*url\(["']?([^"')]+\.(?:jpg|jpeg|png|webp|avif)[^"')]*)["']?\)/gi,
    /"image":"([^"]+\.(?:jpg|jpeg|png|webp|avif)[^"]*)"/gi,
  ]
  
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(html)) !== null) {
      let url = match[1]
      if (url.startsWith("//")) url = "https:" + url
      else if (url.startsWith("/")) url = new URL(url, baseUrl).href
      if (url.startsWith("http")) urls.add(url)
    }
  }
  
  // Filter for product-like images (not icons, logos, etc.)
  return [...urls].filter(url => {
    const lower = url.toLowerCase()
    return !lower.includes("logo") && 
           !lower.includes("icon") && 
           !lower.includes("favicon") &&
           !lower.includes("sprite") &&
           !lower.includes("banner") &&
           !lower.includes("footer") &&
           !lower.includes("header") &&
           !lower.includes("avatar") &&
           (lower.includes("product") || lower.includes("fly") || lower.includes("upload") || lower.includes("image") || lower.includes("cdn") || lower.includes("mifile"))
  }).slice(0, 10) // Max 10 images per page
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000)
    })
    return await res.text()
  } catch {
    return null
  }
}

async function fetchImageBuffer(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000)
    })
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

async function processImage(buffer, size = 800) {
  try {
    return await sharp(buffer)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
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

// Product-specific manufacturer URLs to search
const MANUFACTURER_URLS = {
  "xiaomi": ["https://www.mi.com/global/product/", "https://www.mi.com/uk/product/"],
  "samsung": ["https://www.samsung.com/"],
  "motorola": ["https://www.motorola.com/"],
  "asus": ["https://www.asus.com/"],
  "lenovo": ["https://www.lenovo.com/"],
}

async function main() {
  console.log("=== S2: Fetch Color-Variant Images (v2) ===\n")

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

    // Search for product images from various sources
    const searchUrls = [
      `https://www.google.com/search?q=${encodeURIComponent(row.name + " product png transparent")}&tbm=isch`,
    ]

    const newImages = []
    
    for (const color of colors) {
      console.log(`  Color: ${color}`)
      
      // Try to find images for this color
      for (const angle of ANGLES) {
        const searchQuery = `${row.name} ${color} ${angle === "front" ? "" : angle + " view"}`
        console.log(`    Searching: ${searchQuery.substring(0, 60)}...`)
        
        // Try Google Images search page
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`
        const html = await fetchPage(googleUrl)
        
        if (html) {
          const urls = extractImageUrls(html, "https://www.google.com")
          console.log(`    Found ${urls.length} potential images`)
          
          for (const imgUrl of urls.slice(0, 3)) {
            const buffer = await fetchImageBuffer(imgUrl)
            if (!buffer || buffer.length < 5000) continue
            
            const processed = await processImage(buffer)
            if (!processed) continue
            
            const path = `products/${row.slug}/${color}/${angle}.png`
            const uploaded = await uploadToStorage(path, processed)
            if (uploaded) {
              const publicUrl = `https://vxttpffxhyrdeawjypks.supabase.co/storage/v1/object/public/products/${path}`
              newImages.push({ url: publicUrl, color })
              totalUploaded++
              console.log(`    Uploaded: ${angle}.png (${(processed.length/1024).toFixed(0)}KB)`)
              break
            }
          }
        }
        
        if (!newImages.find(i => i.color === color && i.url.includes(angle))) {
          totalFailed++
          console.log(`    No image found for ${angle}`)
        }
        
        await sleep(DELAY)
      }
    }

    // Update database
    if (newImages.length > 0) {
      const existingImages = images.filter(i => !colors.includes(i.color))
      const allImages = [...existingImages, ...newImages]
      
      await pool.query(
        "UPDATE public.product SET images = $1 WHERE id = $2",
        [JSON.stringify(allImages), row.id]
      )
      console.log(`  Updated DB: ${allImages.length} images`)
    }
  }

  console.log(`\n=== Results ===`)
  console.log(`Uploaded: ${totalUploaded}`)
  console.log(`Failed: ${totalFailed}`)

  await pool.end()
}

main().catch(e => { console.error("Error:", e.message); process.exit(1) })
