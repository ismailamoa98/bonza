-- CreateTable
CREATE TABLE "StatementQuarantine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "parsedBalance" INTEGER,
    "confidence" DECIMAL(4,3) NOT NULL,
    "matchedPattern" TEXT,
    "verdict" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "statementDate" DATE,
    "bodyFingerprint" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatementQuarantine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParseAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "programme" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "confidence" DECIMAL(4,3),
    "matchedPattern" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParseAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatementQuarantine_userId_resolved_idx" ON "StatementQuarantine"("userId", "resolved");

-- CreateIndex
CREATE INDEX "StatementQuarantine_programme_createdAt_idx" ON "StatementQuarantine"("programme", "createdAt");

-- CreateIndex
CREATE INDEX "ParseAttempt_programme_createdAt_idx" ON "ParseAttempt"("programme", "createdAt");

-- CreateIndex
CREATE INDEX "ParseAttempt_outcome_createdAt_idx" ON "ParseAttempt"("outcome", "createdAt");

-- AddForeignKey
ALTER TABLE "StatementQuarantine" ADD CONSTRAINT "StatementQuarantine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

