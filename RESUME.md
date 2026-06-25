# Prompt para retomar — Lo Pedís, Lo Tenes (ex ImportExpress)

**Repo:** `github.com/phloquillo35/importexpress` — branch `main`
**Último commit:** `7aae164` — Rediseño Apple (fondo blanco, azul #0071e3, navbar glass rounded-b-2xl), rebrand a "Lo Pedís, Lo Tenes", Instagram @lopedis_lotenes.01
**Deploy:** https://importexpress-production.up.railway.app
**Admin:** admin@importexpress.com / admin123

## Comandos clave

| Acción | Comando |
|---|---|
| Build y preview local | `npm run build && npm run start` |
| Deployar | `railway up --detach` |
| Logs | `railway logs` |
| Comando remoto | `railway ssh -- "comando"` |

## Reglas estrictas

1. **Siempre** correr `npm run build` y probar en localhost antes de deployar.
2. No deployar sin confirmación del cliente.
3. Railway CLI linked con volumen de datos incluido.
4. No tocar nada del admin panel a menos que el cliente lo pida.

## Estado actual

- Frontend público rediseñado completo.
- Admin panel sin cambios.
- Pendiente: lo que el cliente pida mañana (revisión en prod + ajustes).

## Stack

- Next.js + TypeScript + Tailwind
- Prisma (SQLite en Railway volume)
- Hosting: Railway
