/*
  Warnings:

  - You are about to drop the `ImportBatch` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ImportBatch";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Bulk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'grande',
    "courier" TEXT NOT NULL DEFAULT 'buspack',
    "trackingCode" TEXT,
    "totalCostUSD" REAL NOT NULL DEFAULT 0,
    "totalCostARS" REAL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "products" JSONB NOT NULL,
    "distributorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bulk_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "clientSurname" TEXT NOT NULL DEFAULT '',
    "clientPhone" TEXT NOT NULL DEFAULT '',
    "clientEmail" TEXT NOT NULL DEFAULT '',
    "storeName" TEXT NOT NULL DEFAULT '',
    "clientContact" TEXT NOT NULL,
    "totalUSD" REAL NOT NULL,
    "totalARS" REAL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Order" ("clientContact", "clientName", "createdAt", "id", "notes", "status", "totalARS", "totalUSD", "updatedAt") SELECT "clientContact", "clientName", "createdAt", "id", "notes", "status", "totalARS", "totalUSD", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priceUSD" REAL NOT NULL,
    "bulkId" TEXT,
    "trackingCode" TEXT,
    "shippingStatus" TEXT NOT NULL DEFAULT 'pending',
    "bulkType" TEXT,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_bulkId_fkey" FOREIGN KEY ("bulkId") REFERENCES "Bulk" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("id", "orderId", "priceUSD", "productId", "quantity") SELECT "id", "orderId", "priceUSD", "productId", "quantity" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "specs" JSONB,
    "images" JSONB,
    "priceUSD" REAL NOT NULL,
    "priceARS" REAL,
    "costUSD" REAL,
    "costUSDT" REAL,
    "yoniEnabled" BOOLEAN NOT NULL DEFAULT false,
    "shippingCost" REAL NOT NULL DEFAULT 0,
    "profitType" TEXT NOT NULL DEFAULT 'percentage',
    "profitValue" REAL NOT NULL DEFAULT 0,
    "finalPriceUSD" REAL NOT NULL DEFAULT 0,
    "finalPriceARS" REAL NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 5,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT,
    "distributorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("categoryId", "costUSD", "createdAt", "description", "distributorId", "id", "images", "isAvailable", "isFeatured", "minStock", "name", "priceARS", "priceUSD", "slug", "specs", "stock", "updatedAt") SELECT "categoryId", "costUSD", "createdAt", "description", "distributorId", "id", "images", "isAvailable", "isFeatured", "minStock", "name", "priceARS", "priceUSD", "slug", "specs", "stock", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
