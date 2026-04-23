-- AddRepairPayment: tabla espejo de SalePayment para tracking por pago con método.
CREATE TABLE "RepairPayment" (
    "id"            SERIAL                NOT NULL,
    "repairId"      INTEGER               NOT NULL,
    "amount"        DOUBLE PRECISION      NOT NULL,
    "paymentMethod" TEXT                  NOT NULL DEFAULT 'CASH',
    "notes"         TEXT,
    "createdAt"     TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RepairPayment_repairId_idx" ON "RepairPayment"("repairId");
CREATE INDEX "RepairPayment_createdAt_idx" ON "RepairPayment"("createdAt");

ALTER TABLE "RepairPayment"
    ADD CONSTRAINT "RepairPayment_repairId_fkey"
    FOREIGN KEY ("repairId") REFERENCES "Repair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: por cada Repair con advancePayment > 0, crear un RepairPayment con método UNKNOWN.
INSERT INTO "RepairPayment" ("repairId", "amount", "paymentMethod", "notes", "createdAt")
SELECT "id", "advancePayment", 'UNKNOWN', 'Migrado de anticipo histórico', "updatedAt"
FROM "Repair"
WHERE "advancePayment" > 0;
