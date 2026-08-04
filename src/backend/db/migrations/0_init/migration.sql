-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "location" TEXT,
    "travelStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceFingerprint" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "homeAirport" TEXT,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "travelStyle" TEXT,
    "gmailConnected" BOOLEAN NOT NULL DEFAULT false,
    "gmailRefreshToken" TEXT,
    "outlookConnected" BOOLEAN NOT NULL DEFAULT false,
    "outlookRefreshToken" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "budget" INTEGER NOT NULL,
    "numberOfTravelers" INTEGER NOT NULL DEFAULT 1,
    "flexibility" BOOLEAN NOT NULL DEFAULT false,
    "loyaltyPoints" JSONB NOT NULL,
    "preferences" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "totalCashCost" INTEGER NOT NULL,
    "pointsUsed" INTEGER NOT NULL,
    "pointsProgram" TEXT NOT NULL,
    "flightDetails" JSONB NOT NULL,
    "hotelDetails" JSONB NOT NULL,
    "carDetails" JSONB NOT NULL,
    "benefits" JSONB NOT NULL,
    "reasoning" TEXT NOT NULL,
    "valueMultiplier" DOUBLE PRECISION NOT NULL,
    "savingsAmount" INTEGER NOT NULL,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "selectedScenarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "selectedScenarioId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "BookingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateLink" (
    "id" TEXT NOT NULL,
    "bookingLinkId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversion" (
    "id" TEXT NOT NULL,
    "bookingLinkId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "bookingId" TEXT,
    "commissionAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "status" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'pro_annual',
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonzaCredit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonzaCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "accountNumber" TEXT,
    "programmeAccountId" TEXT,
    "loyaltyEmailAddress" TEXT,
    "balance" INTEGER NOT NULL,
    "valueGbp" DOUBLE PRECISION NOT NULL,
    "statusTier" TEXT,
    "pointsExpireAt" TIMESTAMP(3),
    "lastSynced" TIMESTAMP(3) NOT NULL,
    "syncMethod" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "programme" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "bookingType" TEXT NOT NULL,
    "leg" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" TIMESTAMP(3),
    "commissionEst" DOUBLE PRECISION,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "journeyId" TEXT,
    "tripId" TEXT,
    "origin" TEXT,
    "destination" TEXT,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "travelers" INTEGER NOT NULL DEFAULT 1,
    "leg" TEXT NOT NULL,
    "bookingType" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "supplierReference" TEXT,
    "description" TEXT,
    "cashValueGbp" DOUBLE PRECISION,
    "pointsUsed" INTEGER,
    "pointsProgramme" TEXT,
    "pointsValueGbp" DOUBLE PRECISION,
    "serviceFeeGbp" DOUBLE PRECISION,
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "confirmationMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "creditsAwarded" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserJourney" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tripId" TEXT,
    "origin" TEXT,
    "destination" TEXT,
    "travelDates" TEXT,
    "recommendedScenario" TEXT,
    "recommendedProgramme" TEXT,
    "pointsRecommended" INTEGER,
    "transferConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "transferProgramme" TEXT,
    "transferToProgramme" TEXT,
    "transferAmount" INTEGER,
    "transferConfirmedAt" TIMESTAMP(3),
    "deepLinkClicked" BOOLEAN NOT NULL DEFAULT false,
    "deepLinkClickedAt" TIMESTAMP(3),
    "deepLinkLeg" TEXT,
    "bookingConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "bookingMethod" TEXT,
    "bookingConfirmedAt" TIMESTAMP(3),
    "bookingValueGbp" DOUBLE PRECISION,
    "creditsAwarded" DOUBLE PRECISION,
    "creditsAwardedAt" TIMESTAMP(3),
    "isFirstBooking" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardAvailability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cabin" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "seatsAvail" INTEGER,
    "taxesGbp" DOUBLE PRECISION,
    "bookingUrl" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AwardAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalisedRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "imageUrl" TEXT,
    "specLine" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "pointsOption" JSONB,
    "cashOption" JSONB,
    "hotelOption" JSONB,
    "aiInsight" TEXT NOT NULL,
    "whyPersonalised" TEXT NOT NULL,
    "urgencySignal" TEXT,
    "bestOptionType" TEXT NOT NULL,
    "pointsValueRating" TEXT NOT NULL,
    "centsPerPoint" DOUBLE PRECISION,
    "cashSavingGbp" DOUBLE PRECISION,
    "creditsIfCash" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "viewedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalisedRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "bookingId" TEXT,
    "journeyId" TEXT,
    "programme" TEXT,
    "readAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "awardAlerts" BOOLEAN NOT NULL DEFAULT true,
    "expiryWarnings" BOOLEAN NOT NULL DEFAULT true,
    "priceDropAlerts" BOOLEAN NOT NULL DEFAULT true,
    "monthlySummary" BOOLEAN NOT NULL DEFAULT true,
    "bookingUpdates" BOOLEAN NOT NULL DEFAULT true,
    "proUpdates" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BookingLink_token_key" ON "BookingLink"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyAccount_userId_programme_key" ON "LoyaltyAccount"("userId", "programme");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyAccount_programme_programmeAccountId_key" ON "LoyaltyAccount"("programme", "programmeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyAccount_programme_loyaltyEmailAddress_key" ON "LoyaltyAccount"("programme", "loyaltyEmailAddress");

-- CreateIndex
CREATE INDEX "AwardAvailability_userId_origin_destination_idx" ON "AwardAvailability"("userId", "origin", "destination");

-- CreateIndex
CREATE INDEX "AwardAvailability_expiresAt_idx" ON "AwardAvailability"("expiresAt");

-- CreateIndex
CREATE INDEX "PersonalisedRecommendation_userId_isActive_expiresAt_idx" ON "PersonalisedRecommendation"("userId", "isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "Notification_userId_dismissedAt_createdAt_idx" ON "Notification"("userId", "dismissedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLink" ADD CONSTRAINT "BookingLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLink" ADD CONSTRAINT "BookingLink_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateLink" ADD CONSTRAINT "AffiliateLink_bookingLinkId_fkey" FOREIGN KEY ("bookingLinkId") REFERENCES "BookingLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_bookingLinkId_fkey" FOREIGN KEY ("bookingLinkId") REFERENCES "BookingLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonzaCredit" ADD CONSTRAINT "BonzaCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonzaCredit" ADD CONSTRAINT "BonzaCredit_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyAccount" ADD CONSTRAINT "LoyaltyAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "UserJourney"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJourney" ADD CONSTRAINT "UserJourney_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEvent" ADD CONSTRAINT "UserEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalisedRecommendation" ADD CONSTRAINT "PersonalisedRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

