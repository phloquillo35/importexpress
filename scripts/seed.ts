import { PrismaClient } from "../src/generated/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { hash } from "bcryptjs"
import { randomUUID } from "crypto"

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" }),
})

async function main() {
  const existing = await prisma.admin.findUnique({
    where: { email: "lopedislotenes@admin.com" },
  })

  if (existing) {
    console.log("Admin already exists")
    await prisma.$disconnect()
    return
  }

  const hashed = await hash("elpiratad", 12)

  await prisma.admin.create({
    data: {
      id: randomUUID(),
      email: "lopedislotenes@admin.com",
      name: "Admin",
      password: hashed,
    },
  })

  const settings = [
    { id: randomUUID(), key: "exchange_rate", value: "1200" },
    { id: randomUUID(), key: "business_name", value: "ImportExpress" },
    { id: randomUUID(), key: "whatsapp", value: "5491123456789" },
    { id: randomUUID(), key: "instagram", value: "@importexpress" },
  ]

  for (const setting of settings) {
    await prisma.setting.create({ data: setting })
    console.log(`Setting "${setting.key}" created`)
  }

  console.log("Admin created: lopedislotenes@admin.com / elpiratad")
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
