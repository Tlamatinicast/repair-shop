-- AddWarrantyFields
ALTER TABLE "Repair" ADD COLUMN "warrantyType" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "Repair" ADD COLUMN "warrantyVoided" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Repair" ADD COLUMN "warrantyVoidReason" TEXT;
