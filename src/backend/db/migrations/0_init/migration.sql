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
    "consentAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "consentMarketing" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "title" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "dateOfBirth" TEXT,
    "phone" TEXT,
    "phoneCountryCode" TEXT DEFAULT '+44',
    "passportNumber" TEXT,
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
    "statusRenewsAt" TIMESTAMP(3),
    "nightsThisYear" INTEGER,
    "lastSynced" TIMESTAMP(3) NOT NULL,
    "syncMethod" TEXT NOT NULL,
    "syncState" TEXT NOT NULL DEFAULT 'not_checked',
    "previousBalance" INTEGER,
    "statementDate" TIMESTAMP(3),
    "statementSource" TEXT,
    "manualOverrideAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceSyncRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "mailbox" TEXT NOT NULL,
    "programmesChecked" INTEGER NOT NULL DEFAULT 0,
    "statementsFound" INTEGER NOT NULL DEFAULT 0,
    "balancesUpdated" INTEGER NOT NULL DEFAULT 0,
    "balancesVerified" INTEGER NOT NULL DEFAULT 0,
    "notChecked" INTEGER NOT NULL DEFAULT 0,
    "modalPending" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BalanceSyncRun_pkey" PRIMARY KEY ("id")
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
    "propertyName" TEXT,
    "propertyPlaceId" TEXT,
    "supplierReference" TEXT,
    "idempotencyKey" TEXT,
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

-- CreateTable
CREATE TABLE "PropertyInsight" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "name" TEXT,
    "city" TEXT,
    "location" DOUBLE PRECISION NOT NULL,
    "comfort" DOUBLE PRECISION NOT NULL,
    "facilities" DOUBLE PRECISION NOT NULL,
    "summary" TEXT,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'claude',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "placeId" TEXT NOT NULL,
    "propertyName" TEXT,
    "rating" INTEGER NOT NULL,
    "location" INTEGER,
    "comfort" INTEGER,
    "facilities" INTEGER,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammeValuation" (
    "id" TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brandColor" TEXT NOT NULL,
    "logoUrl" TEXT,
    "initials" TEXT NOT NULL DEFAULT '?',
    "centsPerPoint" DOUBLE PRECISION NOT NULL,
    "benchmarkCpp" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'pts',
    "isTransferable" BOOLEAN NOT NULL DEFAULT false,
    "hasPointsProgramme" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgrammeValuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "accountId" TEXT,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detail" TEXT,
    "amount" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "relatedProgramme" TEXT,
    "relatedActivityId" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferPartner" (
    "id" TEXT NOT NULL,
    "fromProgramme" TEXT NOT NULL,
    "toProgramme" TEXT NOT NULL,
    "ratioFrom" INTEGER NOT NULL,
    "ratioTo" INTEGER NOT NULL,
    "transferTimeHrs" INTEGER,
    "minimumTransfer" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "bonusActive" BOOLEAN NOT NULL DEFAULT false,
    "bonusPercent" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroDestination" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL,
    "gradient" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nights" INTEGER NOT NULL DEFAULT 5,
    "adults" INTEGER NOT NULL DEFAULT 2,
    "travelMonth" TEXT,
    "originCode" TEXT NOT NULL DEFAULT 'LHR',
    "destCode" TEXT NOT NULL DEFAULT '',
    "routeLabel" TEXT NOT NULL DEFAULT '',
    "carrier" TEXT,
    "flightCash" INTEGER NOT NULL DEFAULT 0,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeroDestination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationAward" (
    "id" TEXT NOT NULL,
    "destinationSlug" TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "propertyName" TEXT NOT NULL,
    "propertyCode" TEXT,
    "pointsTotal" INTEGER NOT NULL,
    "hotelCash" INTEGER NOT NULL DEFAULT 0,
    "starRating" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinationAward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExploreCountry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "continent" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "heroImageUrl" TEXT,
    "blurb" TEXT,
    "gradient" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "fromPoints" INTEGER,
    "fromCurrency" TEXT,
    "fromProgramme" TEXT,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExploreCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExploreCity" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iataCode" TEXT NOT NULL,
    "imageUrl" TEXT,
    "hotelsOnPoints" INTEGER NOT NULL DEFAULT 0,
    "holidayType" TEXT,
    "hotelCashFrom" INTEGER,
    "hotelPointsFrom" INTEGER,
    "hotelProgramme" TEXT,
    "carrier" TEXT,
    "flightMinutes" INTEGER,
    "isDirect" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ExploreCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExploreHotel" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "propertyName" TEXT NOT NULL,
    "propertyCode" TEXT,
    "starRating" INTEGER,
    "pointsTotal" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExploreHotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExploreAvailability" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "originCode" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "seatsFound" INTEGER NOT NULL DEFAULT 0,
    "cheapestPoints" INTEGER,
    "programme" TEXT,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExploreAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExploreRoute" (
    "id" TEXT NOT NULL,
    "originCode" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "cityId" TEXT,
    "cashFrom" INTEGER NOT NULL,
    "pointsFrom" INTEGER NOT NULL,
    "pointsProgramme" TEXT NOT NULL,
    "awardSeatsOpen" BOOLEAN NOT NULL DEFAULT false,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExploreRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopularTrip" (
    "id" TEXT NOT NULL,
    "originCode" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "destCode" TEXT NOT NULL,
    "destCity" TEXT NOT NULL,
    "routeLabel" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "gradient" TEXT NOT NULL,
    "departDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL,
    "nights" INTEGER NOT NULL DEFAULT 5,
    "adults" INTEGER NOT NULL DEFAULT 2,
    "cashTotal" INTEGER NOT NULL,
    "flightPoints" INTEGER,
    "flightCurrency" TEXT,
    "hotelPoints" INTEGER,
    "hotelProgramme" TEXT,
    "residualCash" INTEGER NOT NULL DEFAULT 0,
    "awardAvailable" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopularTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT '',
    "isTopPick" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "keywords" TEXT[],
    "relatedSlugs" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulYes" INTEGER NOT NULL DEFAULT 0,
    "helpfulNo" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "urgency" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "bookingId" TEXT,
    "contextJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'open',
    "assignedTo" TEXT,
    "firstReplyAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "slaTarget" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorName" TEXT,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammeContact" (
    "programme" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phoneUk" TEXT,
    "phoneIntl" TEXT,
    "contactUrl" TEXT NOT NULL,
    "manageUrl" TEXT NOT NULL,
    "hoursNote" TEXT,

    CONSTRAINT "ProgrammeContact_pkey" PRIMARY KEY ("programme")
);

-- CreateTable
CREATE TABLE "ServiceStatus" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'operational',
    "message" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "context" TEXT NOT NULL,

    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "LoyaltyAccount_userId_programme_accountNumber_key" ON "LoyaltyAccount"("userId", "programme", "accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyAccount_programme_programmeAccountId_key" ON "LoyaltyAccount"("programme", "programmeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyAccount_programme_loyaltyEmailAddress_key" ON "LoyaltyAccount"("programme", "loyaltyEmailAddress");

-- CreateIndex
CREATE INDEX "BalanceSyncRun_userId_startedAt_idx" ON "BalanceSyncRun"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");

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

-- CreateIndex
CREATE UNIQUE INDEX "PropertyInsight_placeId_key" ON "PropertyInsight"("placeId");

-- CreateIndex
CREATE INDEX "PropertyReview_placeId_status_createdAt_idx" ON "PropertyReview"("placeId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyReview_userId_placeId_key" ON "PropertyReview"("userId", "placeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammeValuation_programme_key" ON "ProgrammeValuation"("programme");

-- CreateIndex
CREATE INDEX "PointsActivity_userId_occurredAt_idx" ON "PointsActivity"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "PointsActivity_userId_programme_occurredAt_idx" ON "PointsActivity"("userId", "programme", "occurredAt");

-- CreateIndex
CREATE INDEX "TransferPartner_fromProgramme_isActive_idx" ON "TransferPartner"("fromProgramme", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TransferPartner_fromProgramme_toProgramme_key" ON "TransferPartner"("fromProgramme", "toProgramme");

-- CreateIndex
CREATE UNIQUE INDEX "HeroDestination_slug_key" ON "HeroDestination"("slug");

-- CreateIndex
CREATE INDEX "DestinationAward_destinationSlug_sortOrder_idx" ON "DestinationAward"("destinationSlug", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationAward_destinationSlug_programme_key" ON "DestinationAward"("destinationSlug", "programme");

-- CreateIndex
CREATE UNIQUE INDEX "ExploreCountry_code_key" ON "ExploreCountry"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ExploreCity_countryCode_iataCode_key" ON "ExploreCity"("countryCode", "iataCode");

-- CreateIndex
CREATE INDEX "ExploreHotel_cityId_sortOrder_idx" ON "ExploreHotel"("cityId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ExploreHotel_cityId_programme_key" ON "ExploreHotel"("cityId", "programme");

-- CreateIndex
CREATE INDEX "ExploreAvailability_cityId_originCode_month_idx" ON "ExploreAvailability"("cityId", "originCode", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ExploreAvailability_cityId_originCode_month_key" ON "ExploreAvailability"("cityId", "originCode", "month");

-- CreateIndex
CREATE INDEX "ExploreRoute_originCode_cashFrom_idx" ON "ExploreRoute"("originCode", "cashFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ExploreRoute_originCode_countryCode_cityId_key" ON "ExploreRoute"("originCode", "countryCode", "cityId");

-- CreateIndex
CREATE INDEX "PopularTrip_originCode_isActive_sortOrder_idx" ON "PopularTrip"("originCode", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PopularTrip_originCode_destCode_key" ON "PopularTrip"("originCode", "destCode");

-- CreateIndex
CREATE UNIQUE INDEX "HelpArticle_slug_key" ON "HelpArticle"("slug");

-- CreateIndex
CREATE INDEX "HelpArticle_category_order_idx" ON "HelpArticle"("category", "order");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_reference_key" ON "SupportTicket"("reference");

-- CreateIndex
CREATE INDEX "SupportTicket_status_slaTarget_idx" ON "SupportTicket"("status", "slaTarget");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceStatus_service_key" ON "ServiceStatus"("service");

-- CreateIndex
CREATE INDEX "LegalAcceptance_userId_document_idx" ON "LegalAcceptance"("userId", "document");

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
ALTER TABLE "BalanceSyncRun" ADD CONSTRAINT "BalanceSyncRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "PropertyReview" ADD CONSTRAINT "PropertyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsActivity" ADD CONSTRAINT "PointsActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferPartner" ADD CONSTRAINT "TransferPartner_fromProgramme_fkey" FOREIGN KEY ("fromProgramme") REFERENCES "ProgrammeValuation"("programme") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferPartner" ADD CONSTRAINT "TransferPartner_toProgramme_fkey" FOREIGN KEY ("toProgramme") REFERENCES "ProgrammeValuation"("programme") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationAward" ADD CONSTRAINT "DestinationAward_destinationSlug_fkey" FOREIGN KEY ("destinationSlug") REFERENCES "HeroDestination"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExploreCity" ADD CONSTRAINT "ExploreCity_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "ExploreCountry"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExploreHotel" ADD CONSTRAINT "ExploreHotel_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "ExploreCity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExploreAvailability" ADD CONSTRAINT "ExploreAvailability_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "ExploreCity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExploreRoute" ADD CONSTRAINT "ExploreRoute_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "ExploreCountry"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExploreRoute" ADD CONSTRAINT "ExploreRoute_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "ExploreCity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

