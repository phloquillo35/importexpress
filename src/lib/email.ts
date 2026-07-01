import nodemailer from "nodemailer"
import { prisma } from "./prisma"

let transporter: nodemailer.Transporter | null = null
let cachedFrom = ""

async function getTransporter() {
  if (transporter) return { transporter, from: cachedFrom }

  const settings = await prisma.setting.findMany({
    where: { key: { in: ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from"] } },
  })

  const get = (key: string) => settings.find((s) => s.key === key)?.value || ""
  const host = get("smtp_host")
  const port = Number(get("smtp_port")) || 587
  const user = get("smtp_user")
  const pass = get("smtp_pass")
  const from = get("smtp_from") || user

  if (!host || !user || !pass) {
    console.warn("[email] SMTP no configurado — skipping send")
    return null
  }

  cachedFrom = from
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  return { transporter, from }
}

type SendEmailParams = {
  to: string
  subject: string
  text?: string
  html?: string
}

export async function sendEmail({ to, subject, text, html }: SendEmailParams) {
  try {
    const instance = await getTransporter()
    if (!instance) return
    await instance.transporter.sendMail({
      from: instance.from,
      to,
      subject,
      text,
      html,
    })
  } catch (error) {
    console.error("[email] Failed to send:", error)
  }
}
