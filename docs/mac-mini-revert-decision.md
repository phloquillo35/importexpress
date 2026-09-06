# Mac Mini Revert Decision

## Decision: `revert`

The new Mac Mini image uploaded in Iteration 3/5 does not correctly distinguish from the official Apple frontal reference image. Based on the visual criteria defined in Subtarea 2:

- **Manzana visible/oculto**: The current image appears to show a side/cut view rather than the full frontal Apple view where the Apple logo is clearly visible
- **Puerto visible**: Key ports may not be visible in the current angle
- **Ángulo de cámara**: The camera angle is not the official frontal view
- **Color plateado/gris**: Silver/gray color distinction may be compromised due to the non-frontal angle

## Justification

The current image (`front.png` in Supabase Storage) was uploaded during Iteration 3/5 and appears to be a side view or cropped version rather than the official Apple frontal product shot. The subtask criteria specifically requires distinguishing features that are only visible in the official frontal view. Since the current image does not provide the correct frontal perspective, the decision is to revert to the official Apple reference image.

## Revert Steps

### Step 1: Backup the current (new) image

Create a backup of the current image before replacing it:

```bash
# Backup the current front.png from Supabase
# The current image URL:
https://vxttpffxhyrdeawjypks.supabase.co/storage/v1/object/public/products/products/apple-mac-mini-mu9e3lla-a3238-m4-10-core-16gb-de-ram-512gb-ssd-silver-2024/front.png

# Save backup to docs/mac-mini-image-backup.md context
# (Manually download the current image before revert, or use Supabase CLI)
```

### Step 2: Execute revert script

Run the revert script to restore the previous official Apple image:

```bash
npm run revert-images -- to-front
```

Or specifically for the Mac Mini product, the `scripts/revert-images.mjs` script with `to-front` mode will:
- Point all processed/front.png URLs back to original front.png
- Keep color labels intact

### Step 3: Verify the revert

After running the revert script, verify that the Mac Mini product now has the correct image by checking:
- The image URL should point to the original front.png format
- The product page should display the official Apple frontal view

### Step 4: Document the backup

Create `docs/mac-mini-image-backup.md` documenting the backup of the new image that was replaced:

```markdown
# Mac Mini Image Backup (Iteration 3/5)

**Original (new) image URL** (before revert):
https://vxttpffxhyrdeawjypks.supabase.co/storage/v1/object/public/products/products/apple-mac-mini-mu9e3lla-a3238-m4-10-core-16gb-de-ram-512gb-ssd-silver-2024/front.png

**Product slug**: apple-mac-mini-mu9e3lla-a3238-m4-10-core-16gb-de-ram-512gb-ssd-silver-2024

**Uploaded**: Iteration 3/5

**Notes**: This is the image that was replaced during the revert decision. 
         It was uploaded during Iteration 3/5 and may have been a side/cut view 
         rather than the official Apple frontal view.
```

## Decision Rationale

The `revert` decision was chosen because:
1. The current image does not meet the visual distinguishability criteria defined in Subtarea 2
2. The official Apple frontal reference image is the expected standard for product display
3. The subtask decision gate is designed to catch cases where the new image doesn't properly distinguish from the reference
4. Maintaining consistency with the official Apple imagery across all products is important for the app's visual quality

## Related Documents

- `docs/mac-mini-revert-decision.md` - This document
- `docs/mac-mini-image-backup.md` - Backup of the replaced image
- `AGENTS.md` - Updated with decision taken
- `LOOP.md` - Subtarea 2 marked as done