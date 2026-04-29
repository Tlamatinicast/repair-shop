-- Rename laborCost to diagnosisFee in Repair
ALTER TABLE "Repair" RENAME COLUMN "laborCost" TO "diagnosisFee";

-- Add service part fields to RepairPart
ALTER TABLE "RepairPart" ADD COLUMN "isService" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RepairPart" ADD COLUMN "serviceName" TEXT;

-- Make itemId nullable (required for service parts without inventory link)
ALTER TABLE "RepairPart" ALTER COLUMN "itemId" DROP NOT NULL;
