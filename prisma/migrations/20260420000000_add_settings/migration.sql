CREATE TABLE IF NOT EXISTS "Setting" (
    "key"   TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

INSERT INTO "Setting" ("key", "value")
VALUES ('businessName', 'TLAMATECH')
ON CONFLICT ("key") DO NOTHING;
