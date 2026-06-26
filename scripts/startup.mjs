import { execSync } from "child_process"
import { existsSync } from "fs"
import { join } from "path"

const dbPath = join(process.cwd(), "prisma", "dev.db")
const volumeDb = process.env.DATABASE_URL?.replace("file:", "") || dbPath

console.log(`→ Database path: ${volumeDb}`)

const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js")

console.log("→ Running database migrations...")
execSync(`node ${prismaCli} migrate deploy`, { stdio: "inherit", cwd: process.cwd() })

const tsxCli = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs")

console.log("→ Seeding defaults...")
execSync(`node ${tsxCli} prisma/seed.ts`, { stdio: "inherit", cwd: process.cwd() })

console.log("→ Starting application...")
execSync("node server.js", { stdio: "inherit", cwd: process.cwd() })
