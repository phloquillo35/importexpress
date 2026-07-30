-- Add freeShipping column to Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "freeShipping" BOOLEAN NOT NULL DEFAULT false;
