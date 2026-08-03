import nodemailer from "nodemailer"
import { prisma } from "./prisma"

type EmailConfig = {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

async function getSmtpConfig(): Promise<EmailConfig | null> {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from"] } },
  })
  const get = (key: string) => settings.find((s) => s.key === key)?.value || ""
  const host = get("smtp_host")
  const port = Number(get("smtp_port")) || 587
  const user = get("smtp_user")
  const pass = get("smtp_pass")
  const from = get("smtp_from") || user
  if (!host || !user || !pass) return null
  return { host, port, user, pass, from }
}

type SendEmailParams = {
  to: string
  subject: string
  text?: string
  html?: string
}

async function sendViaBrevoApi({ to, subject, text, html }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return false
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: "nicolasmoya113@gmail.com", name: "Lo Pedís, Lo Tenes" },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => "")
    console.error("[email] Brevo API error:", res.status, errBody)
    return false
  }
  return true
}

export async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<boolean> {
  // Producción: API REST Brevo por HTTPS 443 (Railway bloquea SMTP 587/465)
  if (process.env.BREVO_API_KEY) {
    try {
      const ok = await sendViaBrevoApi({ to, subject, text, html })
      if (ok) return true
      console.warn("[email] Brevo API falló, probando fallback SMTP...")
    } catch (error) {
      console.error("[email] Brevo API exception:", error)
    }
  }

  // Fallback: SMTP clásico (útil para desarrollo local donde SMTP sí funciona)
  try {
    const config = await getSmtpConfig()
    if (!config) return false
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
    })
    await transporter.sendMail({ from: config.from, to, subject, text, html })
    return true
  } catch (error) {
    console.error("[email] Failed to send:", error)
    return false
  }
}
