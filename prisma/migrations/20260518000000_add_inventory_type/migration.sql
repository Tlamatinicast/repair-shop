-- AlterTable: add itemType to InventoryItem, default PARTS for existing rows
ALTER TABLE "InventoryItem" ADD COLUMN "itemType" TEXT NOT NULL DEFAULT 'PARTS';
