import { PrismaClient } from "@/generated/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { randomUUID } from "crypto"
import { hashSync } from "bcryptjs"

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db"

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
})

async function main() {
  const admin = await prisma.admin.findUnique({ where: { email: "admin@importexpress.com" } })
  if (!admin) {
    await prisma.admin.create({
      data: {
        id: randomUUID(),
        email: "admin@importexpress.com",
        name: "Admin",
        password: hashSync("admin123", 10),
      },
    })
    console.log("Admin creado: admin@importexpress.com / admin123")
  }

  const settings = [
    { key: "exchange_rate", value: "1350" },
    { key: "business_name", value: "Lo Pedís, Lo Tenes" },
    { key: "whatsapp", value: "5491123456789" },
    { key: "instagram", value: "@lopedis_lotenes.01" },
  ]

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { id: s.key, key: s.key, value: s.value },
    })
  }
  console.log("Settings seeded (exchange_rate=1350)")

  const categories = [
    { name: "Electrónica", slug: "electronica", description: "Celulares, tablets, audífonos y accesorios" },
    { name: "Bicicletas", slug: "bicicletas", description: "Bicicletas y repuestos" },
    { name: "Ropa", slug: "ropa", description: "Indumentaria importada" },
    { name: "Hogar", slug: "hogar", description: "Artículos para el hogar" },
    { name: "Juguetes", slug: "juguetes", description: "Juguetes y juegos" },
  ]

  for (const c of categories) {
    const existing = await prisma.category.findUnique({ where: { slug: c.slug } })
    if (!existing) {
      await prisma.category.create({
        data: { id: randomUUID(), ...c },
      })
      console.log(`Categoría creada: ${c.name}`)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
