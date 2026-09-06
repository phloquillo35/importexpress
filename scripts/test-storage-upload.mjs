import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log("📤 Test upload a Supabase Storage...")
  
  // Create a tiny test PNG (1x1 pixel)
  const testPng = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ])
  
  const { data, error } = await supabase.storage
    .from("products")
    .upload("test/test-image.png", testPng, { contentType: "image/png" })
  
  if (error) {
    console.log(`❌ Error: ${error.message}`)
  } else {
    console.log(`✅ Upload exitoso: ${data.path}`)
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from("products")
      .getPublicUrl("test/test-image.png")
    console.log(`🔗 URL pública: ${urlData.publicUrl}`)
    
    // Verify it's accessible
    const res = await fetch(urlData.publicUrl)
    console.log(`📊 Status: ${res.status} (${res.headers.get("content-type")})`)
    
    // Cleanup
    await supabase.storage.from("products").remove(["test/test-image.png"])
    console.log("🧹 Test eliminado")
  }
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
