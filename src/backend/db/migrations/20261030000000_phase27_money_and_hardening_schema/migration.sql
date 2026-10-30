-- AlterTable
ALTER TABLE "AffiliateClick" DROP COLUMN "commissionEst",
ADD COLUMN     "commissionEstPence" INTEGER;

-- AlterTable
ALTER TABLE "AffiliateLink" ALTER COLUMN "commissionRate" SET DATA TYPE DECIMAL(6,4);

-- AlterTable
ALTER TABLE "AwardAvailability" DROP COLUMN "taxesGbp",
ADD COLUMN     "taxesPence" INTEGER;

-- AlterTable
ALTER TABLE "BonzaCredit" DROP COLUMN "amount",
ADD COLUMN     "amountPence" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "cashValueGbp",
DROP COLUMN "creditsAwarded",
DROP COLUMN "pointsValueGbp",
DROP COLUMN "serviceFeeGbp",
ADD COLUMN     "cashAmount" INTEGER,
ADD COLUMN     "cashCurrency" TEXT DEFAULT 'GBP',
ADD COLUMN     "creditsAwardedPence" INTEGER,
ADD COLUMN     "fxBase" TEXT DEFAULT 'GBP',
ADD COLUMN     "fxRate" DECIMAL(18,8),
ADD COLUMN     "fxRateAt" TIMESTAMP(3),
ADD COLUMN     "paymentIntentId" TEXT,
ADD COLUMN     "pointsValuePence" INTEGER,
ADD COLUMN     "serviceFeePence" INTEGER;

-- AlterTable
ALTER TABLE "Conversion" DROP COLUMN "commissionAmount",
ADD COLUMN     "commissionAmountPence" INTEGER;

-- AlterTable
ALTER TABLE "ExploreCountry" ALTER COLUMN "latitude" SET DATA TYPE DECIMAL(9,6),
ALTER COLUMN "longitude" SET DATA TYPE DECIMAL(9,6);

-- AlterTable
ALTER TABLE "LoyaltyAccount" DROP COLUMN "valueGbp",
ADD COLUMN     "statementReceivedAt" TIMESTAMP(3),
ADD COLUMN     "valuePence" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "statementDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "PersonalisedRecommendation" DROP COLUMN "cashSavingGbp",
DROP COLUMN "creditsIfCash",
ADD COLUMN     "cashSavingPence" INTEGER,
ADD COLUMN     "creditsIfCashPence" INTEGER,
ALTER COLUMN "rating" SET DATA TYPE DECIMAL(4,2),
ALTER COLUMN "centsPerPoint" SET DATA TYPE DECIMAL(8,4);

-- AlterTable
ALTER TABLE "ProgrammeValuation" ALTER COLUMN "centsPerPoint" SET DATA TYPE DECIMAL(8,4),
ALTER COLUMN "benchmarkCpp" SET DATA TYPE DECIMAL(8,4);

-- AlterTable
ALTER TABLE "PropertyInsight" ALTER COLUMN "location" SET DATA TYPE DECIMAL(4,2),
ALTER COLUMN "comfort" SET DATA TYPE DECIMAL(4,2),
ALTER COLUMN "facilities" SET DATA TYPE DECIMAL(4,2),
ALTER COLUMN "rating" SET DATA TYPE DECIMAL(4,2);

-- AlterTable
ALTER TABLE "Scenario" ALTER COLUMN "valueMultiplier" SET DATA TYPE DECIMAL(6,4);

-- AlterTable
ALTER TABLE "TransferPartner" ADD COLUMN     "ratioFetchedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserJourney" DROP COLUMN "bookingValueGbp",
DROP COLUMN "creditsAwarded",
ADD COLUMN     "bookingValuePence" INTEGER,
ADD COLUMN     "creditsAwardedPence" INTEGER;

-- CreateTable
CREATE TABLE "ProcessedWebhook" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT NOT NULL,

    CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletedCustomer" (
    "id" TEXT NOT NULL,
    "userHash" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "DeletedCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FxRate" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL DEFAULT 'GBP',
    "quote" TEXT NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "date" DATE NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'live',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FxRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedWebhook_provider_eventId_key" ON "ProcessedWebhook"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "DeletedCustomer_userHash_key" ON "DeletedCustomer"("userHash");

-- CreateIndex
CREATE INDEX "FxRate_base_quote_date_idx" ON "FxRate"("base", "quote", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FxRate_base_quote_date_key" ON "FxRate"("base", "quote", "date");

