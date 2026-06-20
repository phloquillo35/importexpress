import { PrismaClient } from "@/generated/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db"

const prismaClientSingleton = () => {
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  })
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
