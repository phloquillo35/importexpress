import pg from "pg"
import { hashSync } from "bcryptjs"
import { randomUUID } from "crypto"

const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})

async function main() {
  const email = "lopedislotenes@admin.com"
  const password = hashSync("elpiratad", 10)
  const id = randomUUID()
  
  const existing = await pool.query("SELECT id FROM public.admin WHERE email = $1", [email])
  
  if (existing.rows.length > 0) {
    console.log("⚠️ Admin ya existe:", email)
  } else {
    await pool.query(
      "INSERT INTO public.admin (id, email, name, password, role) VALUES ($1, $2, $3, $4, $5)",
      [id, email, "Admin", password, "admin"]
    )
    console.log("✅ Admin creado:", email)
  }
  
  // Also create settings
  const settings = [
    { key: "exchange_rate", value: "1350" },
    { key: "business_name", value: "Lo Pedís, Lo Tenes" },
    { key: "whatsapp", value: "5491123456789" },
    { key: "instagram", value: "@lopedis_lotenes.01" },
  ]
  
  for (const s of settings) {
    await pool.query(
      "INSERT INTO public.setting (id, key, value) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = $3",
      [s.key, s.key, s.value]
    )
  }
  console.log("✅ Settings creados")
  
  await pool.end()
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
