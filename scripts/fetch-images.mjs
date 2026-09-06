import pg from "pg"
import fs from "fs"
import { createClient } from "@supabase/supabase-js"
import sharp from "sharp"

const { Pool } = pg
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BATCH_SIZE = parseInt(process.argv[2] || "10")
const START_OFFSET = parseInt(process.argv[3] || "0")
const PROGRESS_FILE = "/tmp/importexpress-image-progress.json"

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8")) } 
  catch { return { done: [], failed: [], lastIndex: 0 } }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

function cleanProductName(name) {
  return name
    .replace(/\s*-\s*(Negro|Blanco|Gris|Azul|Rojo|Verde|Pink|Black|White|Gray|Blue|Red|Green|Gold|Silver|Rose|Clear|Transparent)\s*/gi, "")
    .replace(/\s*\d+[SMGLTB]+\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function searchImage(productName) {
  const cleanName = cleanProductName(productName)
  
  // Try DuckDuckGo Instant Answer API
  try {
    const query = encodeURIComponent(`${cleanName} official product image`)
    const res = await fetch(`https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`, {
      signal: AbortSignal.timeout(10000)
    })
    const data = await res.json()
    
    // Try to get image from Abstract or related topics
    if (data.Image) return data.Image
    if (data.RelatedTopics?.[0]?.Image) return data.RelatedTopics[0].Image
  } catch {}
  
  // Try Wikipedia/Wikimedia for common products
  try {
    const query = encodeURIComponent(cleanName)
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${query}`, {
      signal: AbortSignal.timeout(10000)
    })
    const data = await res.json()
    if (data.thumbnail?.source) return data.thumbnail.source
  } catch {}
  
  // Try direct image search via DuckDuckGo HTML
  try {
    const query = encodeURIComponent(`${cleanName} PNG transparent`)
    const res = await fetch(`https://duckduckgo.com/?q=${query}&iax=images&ia=images`, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000)
    })
    const html = await res.text()
    
    // Extract vqd token
    const vqdMatch = html.match(/vqd=['"]([^'"]+)/)
    if (vqdMatch) {
      const vqd = vqdMatch[1]
      const imgRes = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${query}&vqd=${vqd}&f=,,,,,&p=1`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10000)
      })
      const imgData = await imgRes.json()
      if (imgData.results?.[0]?.image) return imgData.results[0].image
    }
  } catch {}
  
  return null
}

async function downloadAndProcess(imageUrl, slug) {
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(20000)
    })
    
    if (!res.ok) return null
    
    const contentType = res.headers.get("content-type") || ""
    if (!contentType.includes("image")) return null
    
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 1000) return null // too small, probably not a real image
    
    const processed = await sharp(buffer)
      .resize(800, null, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 90 })
      .toBuffer()
    
    return processed
  } catch {
    return null
  }
}

async function uploadToStorage(buffer, slug) {
  const filePath = `products/${slug}/front.png`
  
  const { error } = await supabase.storage
    .from("products")
    .upload(filePath, buffer, { contentType: "image/png", upsert: true })
  
  if (error) throw error
  
  const { data: urlData } = supabase.storage.from("products").getPublicUrl(filePath)
  return urlData.publicUrl
}

async function main() {
  const progress = loadProgress()
  
  const result = await db.query(`
    SELECT id, name, slug, images 
    FROM importexpress.product 
    WHERE "deletedAt" IS NULL
    ORDER BY name
    LIMIT $1 OFFSET $2
  `, [BATCH_SIZE, START_OFFSET])
  
  const products = result.rows
  console.log(`📦 Procesando ${products.length} productos (offset: ${START_OFFSET})...\n`)
  
  let success = 0, failed = 0, skipped = 0
  
  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    
    if (progress.done.includes(p.id)) { skipped++; continue }
    
    process.stdout.write(`[${i + 1}/${products.length}] ${p.name?.substring(0, 50)}... `)
    
    const imageUrl = await searchImage(p.name)
    
    if (!imageUrl) {
      console.log("❌ No image found")
      progress.failed.push(p.id)
      failed++
      saveProgress(progress)
      continue
    }
    
    const buffer = await downloadAndProcess(imageUrl, p.slug)
    
    if (!buffer) {
      console.log("❌ Download failed")
      progress.failed.push(p.id)
      failed++
      saveProgress(progress)
      continue
    }
    
    try {
      const publicUrl = await uploadToStorage(buffer, p.slug)
      const newImages = [{ url: publicUrl, color: null }]
      await db.query(`UPDATE importexpress.product SET images = $1 WHERE id = $2`, [JSON.stringify(newImages), p.id])
      
      console.log(`✅ OK`)
      progress.done.push(p.id)
      success++
    } catch (e) {
      console.log(`❌ ${e.message.substring(0, 40)}`)
      progress.failed.push(p.id)
      failed++
    }
    
    progress.lastIndex = START_OFFSET + i + 1
    saveProgress(progress)
    await new Promise(r => setTimeout(r, 300))
  }
  
  console.log(`\n${"=".repeat(50)}`)
  console.log(`✅ Exitosos: ${success} | ❌ Fallidos: ${failed} | ⏭️ Saltados: ${skipped}`)
  console.log(`📊 Total procesados: ${progress.done.length}/305`)
  console.log(`${"=".repeat(50)}`)
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
