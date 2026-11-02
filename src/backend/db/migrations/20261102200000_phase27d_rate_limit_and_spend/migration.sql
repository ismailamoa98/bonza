-- CreateTable
CREATE TABLE "RateLimitHit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SpendLedger" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SpendLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitHit_resetAt_idx" ON "RateLimitHit"("resetAt");

-- CreateIndex
CREATE INDEX "SpendLedger_date_idx" ON "SpendLedger"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SpendLedger_service_date_key" ON "SpendLedger"("service", "date");

