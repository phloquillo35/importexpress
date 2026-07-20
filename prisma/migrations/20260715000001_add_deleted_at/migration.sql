-- AlterTable: Add deletedAt for soft delete support
ALTER TABLE "Product" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Category" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Bulk" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Transaction" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Distributor" ADD COLUMN "deletedAt" TIMESTAMP(3);
