-- CreateTable: ExpenseTemplate
CREATE TABLE "ExpenseTemplate" (
    "id"            SERIAL          NOT NULL,
    "description"   TEXT            NOT NULL,
    "category"      TEXT            NOT NULL,
    "expenseType"   TEXT            NOT NULL DEFAULT 'FIXED',
    "defaultAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT            NOT NULL DEFAULT 'CASH',
    "active"        BOOLEAN         NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Expense
CREATE TABLE "Expense" (
    "id"            SERIAL          NOT NULL,
    "description"   TEXT            NOT NULL,
    "amount"        DOUBLE PRECISION NOT NULL,
    "category"      TEXT            NOT NULL,
    "expenseType"   TEXT            NOT NULL DEFAULT 'FIXED',
    "paymentMethod" TEXT            NOT NULL DEFAULT 'CASH',
    "notes"         TEXT,
    "date"          TIMESTAMP(3)    NOT NULL,
    "templateId"    INTEGER,
    "createdAt"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "ExpenseTemplate"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
