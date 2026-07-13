-- AlterTable: Add snapshot fields to OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "productName" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "productSlug" TEXT;
ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;

-- Backfill existing OrderItems with product data
UPDATE "OrderItem" SET
  "productName" = (SELECT "name" FROM "Product" WHERE "Product"."id" = "OrderItem"."productId"),
  "productSlug" = (SELECT "slug" FROM "Product" WHERE "Product"."id" = "OrderItem"."productId");

-- Drop old FK and recreate with ON DELETE SET NULL (PostgreSQL)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_productId_fkey') THEN
    ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";
  END IF;
END $$;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
