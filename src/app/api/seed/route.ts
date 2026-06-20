import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { randomUUID } from "crypto"

export async function GET() {
  try {

    const existing = await prisma.admin.findUnique({
      where: { email: "admin@importexpress.com" },
    })

    if (existing) {
      return NextResponse.json({ message: "Admin already exists" })
    }

    const hashed = await hash("admin123", 12)

    await prisma.admin.create({
      data: {
        id: randomUUID(),
        email: "admin@importexpress.com",
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
    }

    return NextResponse.json({
      message: "Admin created: admin@importexpress.com / admin123",
      settings: settings.length,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
