/**
 * Seed default settings into the database.
 * Run once during migration or setup: npx tsx scripts/seed-settings.ts
 *
 * This replaces the inline seed that was previously in the GET /api/configuracion handler.
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const DEFAULT_SETTINGS: Record<string, string> = {
  exchange_rate: "1350",
  usdt_rate: "1400",
  business_name: "Lo Pedís, Lo Tenes",
  whatsapp: "5491123456789",
  whatsapp_david: "5493813360558",
  whatsapp_david_name: "David Adbes",
  whatsapp_brian: "5493816658420",
  whatsapp_brian_name: "Brian Carrizo",
  instagram: "@lopedis_lotenes.01",
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_pass: "",
  smtp_from: "",
}

async function main() {
  let created = 0
  let skipped = 0

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const exists = await prisma.setting.findUnique({ where: { key } })
    if (!exists) {
      await prisma.setting.create({ data: { id: key, key, value } })
      created++
    } else {
      skipped++
    }
  }

  console.log(`Settings seed complete: ${created} created, ${skipped} already existed`)
}

main()
  .catch((e) => {
    console.error("Error seeding settings:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
