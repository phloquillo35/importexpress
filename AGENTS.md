<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:workflow-rules -->
## Workflow colaborativo (Pablo + Nicolás)

### Antes de empezar a trabajar
- Ejecutar `git pull --rebase origin main` para sincronizar con el otro

### Commits
- Hacer commits atómicos: una sola funcionalidad por commit
- Usar prefix convencional: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`

### Antes de pushear (obligatorio)
- El pre-push hook ya corre automáticamente lint + build
- Si el hook cancela el push, arreglar el error antes de reintentar
- Verificar que `npm run build` pase sin errores críticos

### Deploy
- Railway deployea automáticamente cada push a `main`
- Si el build falla en Railway, la app queda caída → siempre verificar local primero
<!-- END:workflow-rules -->
