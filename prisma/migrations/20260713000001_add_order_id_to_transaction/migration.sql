-- AlterTable: Add orderId to Transaction
ALTER TABLE "Transaction" ADD COLUMN "orderId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_orderId_idx" ON "Transaction"("orderId");

-- AddForeignKey (PostgreSQL)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_orderId_fkey') THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Migrate paymentStatus values to Spanish
UPDATE "Order" SET "paymentStatus" = 'debe' WHERE "paymentStatus" = 'pending';
UPDATE "Order" SET "paymentStatus" = 'seña' WHERE "paymentStatus" = 'deposit';
UPDATE "Order" SET "paymentStatus" = 'pagado' WHERE "paymentStatus" = 'paid';
