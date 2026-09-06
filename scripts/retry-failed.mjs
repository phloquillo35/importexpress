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

const FAILED_IDS = [
  "07f6a6a8-9301-4f91-837f-a123eff2441a",
  "a30b415e-ed1a-419e-8c3c-ec4c94a0b4f5",
  "cfe3a2ca-d298-4855-81ca-968fff92a54c",
  "a262f0da-988b-42e7-a8e1-7b7027896b2b",
  "15466a19-b18e-422a-b743-7a3f1a9370a9",
  "4fb5f31b-85a5-4bde-8f9b-82fe41154a5f",
  "3bcfc0c2-eb10-4509-985a-e9b4bbfef872",
  "22c06215-1d2d-434b-8715-646e15cde809",
  "06d37ddb-c582-4367-a984-3f902bfce7e3",
  "fd2e86d4-429b-4cc5-90e6-ad405d1d9321",
  "49fd3a38-03fe-4e7a-81c8-1d8810c21214",
  "b99983d2-3f24-4257-a2b1-c58a000bc86d",
  "e3fba386-cb78-4148-9e08-783f0c70fc0a",
  "2d3dfe60-f638-4b18-93e2-56cd1f5b058d",
  "3ccc827e-d321-4d07-99e0-fafd3e3a70d7",
  "97c77e99-307e-4272-9ac9-664fba491b44",
  "f5a756c7-97f0-4cac-8f88-c22f0bf248c9",
  "5848e4a8-9fcb-4314-9a22-3512371c22f6",
  "8a82835b-3e1f-4124-be5b-b611f3d298df",
  "5df9d636-791f-400d-9651-7064b527c449",
  "95192490-9c70-4c0b-9c47-5fa0e5e81652",
  "3e6e627a-a46b-4f30-9bfe-2a737989e443",
  "31edbb25-1cb3-4a00-bab6-eb8f17e14ab8",
  "3d73c5a1-ea8f-4161-8067-82b88532a960",
  "21469175-a110-45e9-82dd-e439892f0b6a",
  "0f03e556-7c39-4e84-b816-ea25b9ad916d",
  "5cada1db-a790-47e6-aafc-8cbfa5c8be99",
  "8cebed73-a1b2-48d4-a4b1-e11f0852eae0",
  "44f1284e-5902-4dcd-a5c3-cee69c254746",
  "e5051b20-77eb-45bf-824a-0e41e9267c25",
  "f6920e01-e5b3-4bf7-8e27-94c10513ec8c"
]

function cleanProductName(name) {
  return name
    .replace(/\s*-\s*(Negro|Blanco|Gris|Azul|Rojo|Verde|Pink|Black|White|Gray|Blue|Red|Green|Gold|Silver|Rose|Clear|Transparent)\s*/gi, "")
    .replace(/\s*\d+[SMGLTB]+\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function searchImage(productName) {
  const cleanName = cleanProductName(productName)
  
  // Try DuckDuckGo
  try {
    const query = encodeURIComponent(`${cleanName} official product image`)
    const res = await fetch(`https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`, {
      signal: AbortSignal.timeout(10000)
    })
    const data = await res.json()
    if (data.Image) return data.Image
    if (data.RelatedTopics?.[0]?.Image) return data.RelatedTopics[0].Image
  } catch {}
  
  // Try DuckDuckGo HTML with different approach
  try {
    const query = encodeURIComponent(`${cleanName} PNG`)
    const res = await fetch(`https://duckduckgo.com/?q=${query}&iax=images&ia=images`, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000)
    })
    const html = await res.text()
    const vqdMatch = html.match(/vqd=['"]([^'"]+)/)
    if (vqdMatch) {
      const vqd = vqdMatch[1]
      const imgRes = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${query}&vqd=${vqd}&f=,,,,,&p=1`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10000)
      })
      const imgData = await imgRes.json()
      if (imgData.results?.[0]?.image) return imgData.results[0].image
      if (imgData.results?.[1]?.image) return imgData.results[1].image
    }
  } catch {}
  
  // Try Wikipedia
  try {
    const query = encodeURIComponent(cleanName.split(" ").slice(0, 3).join(" "))
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${query}`, {
      signal: AbortSignal.timeout(10000)
    })
    const data = await res.json()
    if (data.thumbnail?.source) return data.thumbnail.source
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
    if (buffer.length < 1000) return null
    return await sharp(buffer).resize(800, null, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ quality: 90 }).toBuffer()
  } catch { return null }
}

async function uploadToStorage(buffer, slug) {
  const filePath = `products/${slug}/front.png`
  const { error } = await supabase.storage.from("products").upload(filePath, buffer, { contentType: "image/png", upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage.from("products").getPublicUrl(filePath)
  return urlData.publicUrl
}

async function main() {
  console.log(`🔄 Reintentando ${FAILED_IDS.length} productos fallidos...\n`)
  
  let success = 0, failed = 0
  
  for (let i = 0; i < FAILED_IDS.length; i++) {
    const id = FAILED_IDS[i]
    const result = await db.query(`SELECT id, name, slug FROM importexpress.product WHERE id = $1`, [id])
    if (result.rows.length === 0) continue
    
    const p = result.rows[0]
    process.stdout.write(`[${i + 1}/${FAILED_IDS.length}] ${p.name?.substring(0, 50)}... `)
    
    const imageUrl = await searchImage(p.name)
    if (!imageUrl) { console.log("❌ No image"); failed++; continue }
    
    const buffer = await downloadAndProcess(imageUrl, p.slug)
    if (!buffer) { console.log("❌ Download failed"); failed++; continue }
    
    try {
      const publicUrl = await uploadToStorage(buffer, p.slug)
      await db.query(`UPDATE importexpress.product SET images = $1 WHERE id = $2`, [JSON.stringify([{ url: publicUrl, color: null }]), p.id])
      console.log("✅ OK")
      success++
    } catch (e) {
      console.log(`❌ ${e.message.substring(0, 40)}`)
      failed++
    }
    
    await new Promise(r => setTimeout(r, 500))
  }
  
  console.log(`\n✅ Recuperados: ${success} | ❌ Aún fallidos: ${failed}`)
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
