-- Create sequences
CREATE SEQUENCE "Order_internalNumber_seq";
CREATE SEQUENCE "Bulk_internalNumber_seq";

-- Add columns (nullable first for backfill)
ALTER TABLE "Order" ADD COLUMN "internalNumber" INTEGER;
ALTER TABLE "Bulk" ADD COLUMN "internalNumber" INTEGER;

-- Backfill existing rows
UPDATE "Order" SET "internalNumber" = s.num FROM (
  SELECT id, nextval('"Order_internalNumber_seq"') as num
  FROM "Order"
  ORDER BY "createdAt"
) s WHERE "Order".id = s.id;

UPDATE "Bulk" SET "internalNumber" = s.num FROM (
  SELECT id, nextval('"Bulk_internalNumber_seq"') as num
  FROM "Bulk"
  ORDER BY "date"
) s WHERE "Bulk".id = s.id;

-- Make required + set default
ALTER TABLE "Order" ALTER COLUMN "internalNumber" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "internalNumber" SET DEFAULT nextval('"Order_internalNumber_seq"');
ALTER SEQUENCE "Order_internalNumber_seq" OWNED BY "Order"."internalNumber";

ALTER TABLE "Bulk" ALTER COLUMN "internalNumber" SET NOT NULL;
ALTER TABLE "Bulk" ALTER COLUMN "internalNumber" SET DEFAULT nextval('"Bulk_internalNumber_seq"');
ALTER SEQUENCE "Bulk_internalNumber_seq" OWNED BY "Bulk"."internalNumber";

-- Unique constraints
CREATE UNIQUE INDEX "Order_internalNumber_key" ON "Order"("internalNumber");
CREATE UNIQUE INDEX "Bulk_internalNumber_key" ON "Bulk"("internalNumber");
