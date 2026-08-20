import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

const BACKUP_DIR = process.env.BACKUP_DIR || "/data/backups"
const DATA_DIR = process.env.DATA_DIR || "/data"
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS) || 7
const MAX_BACKUP_AGE_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000

function formatBytes(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 10) / 10
}

function getDiskSpace(dir: string): { freeBytes: number; freeMB: number } {
  try {
    const stat = fs.statfsSync(dir)
    const freeBytes = stat.bfree * stat.bsize
    return { freeBytes, freeMB: formatBytes(freeBytes) }
  } catch {
    return { freeBytes: 0, freeMB: 0 }
  }
}

function listBackups(dir: string): { name: string; sizeMB: number; mtime: Date }[] {
  if (!fs.existsSync(dir)) return []
  try {
    return fs.readdirSync(dir)
      .filter((f) => f.startsWith("backup-") && f.endsWith(".dump"))
      .map((f) => {
        const fp = path.join(dir, f)
        const stat = fs.statSync(fp)
        return { name: f, sizeMB: formatBytes(stat.size), mtime: stat.mtime }
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
  } catch {
    return []
  }
}

function cleanupOldBackups(dir: string, maxAgeMs: number): number {
  if (!fs.existsSync(dir)) return 0
  let deleted = 0
  const now = Date.now()
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      if (!entry.name.startsWith("backup-") || !entry.name.endsWith(".dump")) continue
      const fp = path.join(dir, entry.name)
      try {
        const stat = fs.statSync(fp)
        if (now - stat.mtime.getTime() > maxAgeMs) {
          fs.unlinkSync(fp)
          deleted++
        }
      } catch {
        // ignore individual file errors
      }
    }
  } catch {
    // ignore dir errors
  }
  return deleted
}

async function sendDiscordWebhook(webhookUrl: string, payload: object): Promise<void> {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

async function sendSuccessWebhook(webhookUrl: string, file: string, sizeMB: number, retained: number): Promise<void> {
  const payload = {
    embeds: [
      {
        title: "✅ Backup DB OK",
        color: 3066993,
        fields: [
          { name: "Archivo", value: file, inline: true },
          { name: "Tamaño", value: `${sizeMB.toFixed(1)} MB`, inline: true },
          { name: "Fecha", value: new Date().toISOString(), inline: true },
          { name: "Backups retenidos", value: String(retained), inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  }
  await sendDiscordWebhook(webhookUrl, payload)
}

async function sendFailureWebhook(webhookUrl: string, error: string): Promise<void> {
  const payload = {
    embeds: [
      {
        title: "❌ Backup DB FALLÓ",
        color: 15158332,
        fields: [
          { name: "Error", value: error.slice(0, 1000) },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  }
  await sendDiscordWebhook(webhookUrl, payload)
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("x-cron-secret")
  if (auth !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const backups = listBackups(BACKUP_DIR)
    const totalSize = backups.reduce((sum, b) => sum + b.sizeMB, 0)
    const diskSpace = getDiskSpace(DATA_DIR)

    return Response.json({
      backupDir: BACKUP_DIR,
      backups: backups.slice(0, 10),
      totalBackups: backups.length,
      totalSizeMB: totalSize,
      retentionDays: RETENTION_DAYS,
      dataDir: {
        path: DATA_DIR,
        freeMB: diskSpace.freeMB,
      },
      mode: "GET — solo estado, usar POST para ejecutar backup",
    })
  } catch (error) {
    console.error("Error getting backup status:", error)
    return Response.json({ error: "Error obteniendo estado de backups" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get("x-cron-secret")
  if (auth !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startTime = Date.now()
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL

  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const tempFile = path.join(BACKUP_DIR, `backup-${timestamp}.tmp`)
    const finalFile = path.join(BACKUP_DIR, `backup-${timestamp}.dump`)

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error("DATABASE_URL no configurada")
    }

    await execFileAsync("pg_dump", ["--format=custom", "--no-owner", "--file=" + tempFile, databaseUrl])

    fs.renameSync(tempFile, finalFile)

    const stat = fs.statSync(finalFile)
    const sizeMB = formatBytes(stat.size)

    const retained = cleanupOldBackups(BACKUP_DIR, MAX_BACKUP_AGE_MS)

    const durationMs = Date.now() - startTime

    if (webhookUrl) {
      try {
        await sendSuccessWebhook(webhookUrl, path.basename(finalFile), sizeMB, retained)
      } catch (webhookError) {
        console.error("Discord webhook failed:", webhookError)
      }
    }

    return Response.json({
      ok: true,
      file: path.basename(finalFile),
      sizeMB,
      retained,
      durationMs,
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"

    if (webhookUrl) {
      try {
        await sendFailureWebhook(webhookUrl, errorMessage)
      } catch (webhookError) {
        console.error("Discord webhook failed:", webhookError)
      }
    }

    console.error("Backup failed:", error)
    return Response.json({ ok: false, error: errorMessage }, { status: 500 })
  }
}