-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "hasFinancing" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_Product" ("categoryId", "costUSD", "costUSDT", "createdAt", "description", "distributorId", "finalPriceARS", "finalPriceUSD", "id", "images", "isAvailable", "isFeatured", "minStock", "name", "priceARS", "priceUSD", "profitType", "profitValue", "shippingCost", "slug", "specs", "stock", "updatedAt", "yoniEnabled") SELECT "categoryId", "costUSD", "costUSDT", "createdAt", "description", "distributorId", "finalPriceARS", "finalPriceUSD", "id", "images", "isAvailable", "isFeatured", "minStock", "name", "priceARS", "priceUSD", "profitType", "profitValue", "shippingCost", "slug", "specs", "stock", "updatedAt", "yoniEnabled" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
