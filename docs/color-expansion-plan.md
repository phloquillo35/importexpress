# Color Expansion Plan — ImportExpress

## Overview
Expandir la cobertura de colores reales a ~100 productos adicionales (JBL, Xiaomi, Armaf, Venzo, monopatines Smartfy), pasando de 305 a ~405 productos con análisis de colores. El objetivo es mantener 0 `sameUrlAllColors` no justificados.

## Product Distribution

| Category | Products | Key Products |
|----------|----------|--------------|
| **P0 — Críticos** | ~20 | Productos con bug `sameUrlAllColors` que requieren corrección urgente |
| **P1 — JBL** | ~15 | Charge 5, Flip 6, Pulse 4, Go 4, Clip 5, Boombox 3, Partybox 310, Tune 760NC, Endurance Run, Vertigo |
| **P1 — Xiaomi** | ~20 | Redmi Buds 5/6, Mi Buds Basic, Watch S3, Redmi Watch 3, 14/14 Pro, Civi 4, Redmi Note 13, Pad 7, Mi Band 8, Roborock S8 |
| **P2 — Resto** | ~65 | Armaf (15), Venzo (10), Smartfy (10), Otros (30) |

## Priority Zones

### P0: Productos Críticos (~20 productos)
**Objetivo**: Corregir bugs donde todos los colores de un producto comparten la misma URL sin justificación.

Los siguientes productos fueron identificados como críticos (tenían múltiples colores con URL compartida):

1. `motorola-g56-5g-xt2529-1-8gb-de-ram-256gb-pantalla-67-dual-sim-5g-` — 1 color, azul marino
2. `consola-sony-playstation-5-slim-cfi-2115-a01x-1tb-bivolt-blanco-americano` — 1 color, blanco
3. `control-sony-dualsense-para-ps5-cfi-zct2w` — 7 colores (blanco/morado/techno rojo/starlight azul/chroma pearl/camuflado gris/remix verde)
4. `control-gamesir-g7-se-para-xbox-series-` — 4 colores (blanco/azul/naranja/rosa)
5. `tablet-xiaomi-mi-pad-8-pro-pantalla-112-wifi-256gb-8gb-ram` — 5 colores (todos gris con variantes)
6. `tablet-xiaomi-pad-8-tela-112-wifi-256gb-8gb-ram-` — 2 colores (celeste/gris)
7. `tablet-samsung-galaxy-tab-s10-fe-sm-x520-tela-109-wifi-128gb-8gb-ram` — 3 colores (gris/plata/celeste)
8. `tablet-xiaomi-pad-7-tela-11-wifi-256gb-8gb-ram` — 3 colores (verde/gris/celeste)
9. `tablet-xiaomi-redmi-pad-2-pro-pantalla-121-wifi-256gb-8gb-ram` — 3 colores (gris/lila/rosa)
10. `tablet-xiaomi-redmi-pad-2-wifi-128gb-4gb-ram-pantalla-11-` — 2 colores (gris/lila)
11. `tablet-xiaomi-redmi-pad-2-pantalla-11-wifi-256gb-8gb-ram-gris-grafito` — 2 colores (gris/lila)
12. `smartwatch-haylou-solar-neo-hf008-ls21` — 2 colores (blanco/negro)
13. `smartwatch-ftx-ftxam12-rgw-bluetooth` — 2 colores (rosa/blanco)
14. `smartwatch-g-tide-watch-r5-lite` — 3 colores (lila/blanco/celeste)
15. `reloj-inteligente-garmin-forerunner-165-music-azul-010-02863-32` — 3 colores (blanco/turquesa/negro)
16. `auricular-g-tide-c1-lite-` — 2 colores (negro/azul)
17. `smartphone-samsung-galaxy-s25-ultra-s938b-5g-ds-12-512gb-69-12mp-105050200mp` — 2 colores (titan black/titan gray)
18. `apple-iphone-15-a3090-hna-128gb-6gb-ram-pantalla-61-` — 2 colores (black/blue)
19. `apple-iphone-16-a3286-3ja-128gb-8gb-ram-pantalla-61` — 2 colores (black/withe)
20. `smarwatch-garmin-forerunner-970-010-02969-02-` — 3 colores (dorado/negro/aqua)

**Acción P0**: Para cada producto crítico:
- Si tiene 1 color: documentar el color y URL oficial
- Si tiene múltiples colores: asignar URLs únicas por color o documentar por qué comparten URL
- Subir imágenes a Supabase con colores correctos
- Verificar que `npm run check-colors.mjs` pase con 0 `sameUrlAllColors` no justificados

### P1: JBL (~15 productos) y Xiaomi (~20 productos)
**Objetivo**: Obtener URLs oficiales por color y upload a Supabase.

**JBL Products (prioridad alta)**:

| Producto | Colores | URLs Oficiales |
|----------|---------|----------------|
| jbl-charge-5 | blanco, negro, azul, rojo | BestBuy, jbl.com |
| jbl-flip-6 | blanco, negro, azul, verde | BestBuy, jbl.com |
| jbl-pulse-4 | blanco, negro, azul, rosa | BestBuy, jbl.com |
| jbl-go-4 | blanco, negro, azul, amarillo | BestBuy, jbl.com |
| jbl-clip-5 | blanco, negro, azul | BestBuy, jbl.com |
| jbl-boombox-3 | blanco, negro | BestBuy, jbl.com |
| jbl-partybox-310 | blanco, negro | BestBuy, jbl.com |
| jbl-tune-760nc | blanco, negro, azul | BestBuy, jbl.com |
| jbl-endurance-run | negro, blanco | BestBuy, jbl.com |
| jbl-vertigo | negro, blanco, azul | BestBuy, jbl.com |

**Xiaomi Products (prioridad alta)**:

| Producto | Colores | URLs Oficiales |
|----------|---------|----------------|
| xiaomi-redmi-buds-5 | negro, blanco, azul | gsmarena, mi.com |
| xiaomi-redmi-buds-6 | negro, blanco, verde | gsmarena, mi.com |
| xiaomi-mi-buds-basic | blanco, negro | gsmarena, mi.com |
| xiaomi-watch-s3 | negro, blanco, verde | gsmarena, mi.com |
| xiaomi-redmi-watch-3 | negro, blanco, azul | gsmarena, mi.com |
| xiaomi-14 | negro, blanco, azul, verde | gsmarena, mi.com |
| xiaomi-14-pro | negro, blanco | gsmarena, mi.com |
| xiaomi-civi-4 | rosa, negro, azul | gsmarena, mi.com |
| xiaomi-redmi-note-13 | negro, azul, verde | gsmarena, mi.com |
| xiaomi-pad-7 | gris, blanco, verde | gsmarena, mi.com |
| xiaomi-mi-band-8 | negro, blanco, verde | mi.com |
| xiaomi-roborock-s8 | negro, blanco | mi.com |

**Acción P1**: Para cada producto JBL y Xiaomi:
1. Research official color URLs from BestBuy, gsmarena, jbl.com, xiaomi mifile
2. Upload images to Supabase Storage under `products/{slug}/{color}/front.png`
3. Update DB `product.images` array with color-labeled URLs
4. Verify each color has a unique URL (no `sameUrlAllColors`)
5. Run `npm run check-colors.mjs` to validate

### P2: Resto (~65 productos: Armaf, Venzo, monopatines, etc.)
**Objetivo**: Consolidar y documentar. Estos productos tienen cobertura de colores limitada o nula.

**Armaf Perfumes (15 productos)**:
- Armaf Nuit Intense, Hunter, TDare, Anarchy, Super Nuit, Island Seduction, Odyssey Mandarin Sky, Le Garb, Club de Nuit, Odyssey Maracuja, Venture, Club de Nuit Intense, Odyssey Aqua, Le Borghese
- La mayoría tienen 1 color. Documentar color y fuente.

**Venzo Bikes (10 productos)**:
- Modelo X, S, E, Urban, Sport, Carrera, Trekking, Plegable
- Colores: negro, blanco, azul, rojo, verde, gris, plateado, naranja

**Smartfy Monopatines (10 productos)**:
- Pro, Air, Mini
- Colores: negro, blanco, azul, rosa, gris

**Otros (30 productos)**: Auriculares gamer Redragon, kits gamer, French Avenue, etc.

**Acción P2**: Consolidar datos existentes, documentar colores únicos por producto, y donde haya múltiples colores con URL compartida, documentar la razón.

## Verification Criteria

- [ ] Script `node scripts/check-colors.mjs` sobre el inventario expandido: 0 `sameUrlAllColors` no justificados
- [ ] Al menos 5 productos JBL y 5 productos Xiaomi con URLs de color distintas y HTTP 200 confirmadas
- [ ] `npm run typecheck` GREEN para scripts nuevos o modificados
- [ ] `@tester` valida count de productos y colores únicos vs duplicados
- [ ] Review `@reviewer` aprueba el plan de expansión

## Success Metrics

- 405 productos totales con análisis de colores
- 0 `sameUrlAllColors` no justificados en el inventario expandido
- ~15 productos JBL con URLs oficiales por color
- ~20 productos Xiaomi con URLs oficiales por color
- ~65 productos de categorías diversas documentados
- Todos los nuevos slugs actualizados en `color-inventory.json`