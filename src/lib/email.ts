import nodemailer from "nodemailer"
import { prisma } from "./prisma"

export async function sendEmail(to: string, subject: string, html: string) {
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
    throw new Error(
      "SMTP no configurado. Primero configurá los datos SMTP en Admin → Configuración."
    )
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  await transporter.sendMail({ from, to, subject, html })
}
