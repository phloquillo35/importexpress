-- AlterTable: Add angles and angleMeta JSONB fields to Product
ALTER TABLE "product" ADD COLUMN "angles" JSONB;
ALTER TABLE "product" ADD COLUMN "angleMeta" JSONB;
