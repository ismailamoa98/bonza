// services/affiliateService.js — wraps outbound URLs with per-network affiliate tracking (raw URL if no token).
const env = require("../config/env");
const prisma = require("../config/database");

const AFFILIATE_CONFIG = {
  travelpayouts: {
    network: "travelpayouts",
    baseUrl: "https://tp.media/r",
    marker: env.TRAVELPAYOUTS_TOKEN,
    estimatedCommissionRate: 0.04, // ~4% avg
  },
  awin_marriott: {
    network: "awin",
    baseUrl: "https://www.awin1.com/cread.php",
    affiliateId: env.AWIN_AFFILIATE_ID,
    advertiserId: "5678", // Marriott Awin advertiser id
    estimatedCommissionRate: 0.02,
  },
  awin_hilton: {
    network: "awin",
    baseUrl: "https://www.awin1.com/cread.php",
    affiliateId: env.AWIN_AFFILIATE_ID,
    advertiserId: "5423", // Hilton Awin advertiser id
    estimatedCommissionRate: 0.015,
  },
  impact_hyatt: {
    network: "impact",
    baseUrl: "https://track.impact.com/go/",
    campaignId: env.IMPACT_HYATT_CAMPAIGN_ID,
    estimatedCommissionRate: 0.02,
  },
};

function hotelAffiliateProgramme(loyaltyProgramme) {
  const map = {
    marriott_bonvoy: "awin_marriott",
    hilton_honors: "awin_hilton",
    world_of_hyatt: "impact_hyatt",
  };
  return map[loyaltyProgramme] || "travelpayouts";
}

function buildAffiliateUrl(programme, destinationUrl, leg) {
  if (!destinationUrl) return destinationUrl || null;
  const config = AFFILIATE_CONFIG[programme];
  if (!config) return destinationUrl;
  const u = encodeURIComponent(destinationUrl);

  switch (config.network) {
    case "travelpayouts":
      if (!config.marker) return destinationUrl;
      return `${config.baseUrl}?marker=${config.marker}&trs=&p=4114&u=${u}`;
    case "awin":
      if (!config.affiliateId) return destinationUrl;
      return `${config.baseUrl}?awinmid=${config.advertiserId}&awinaffid=${config.affiliateId}&clickref=bonza_${leg}&p=${u}`;
    case "impact":
      if (!config.campaignId) return destinationUrl;
      return `${config.baseUrl}${config.campaignId}?u=${u}`;
    default:
      return destinationUrl;
  }
}

function recordClick({ userId = null, programme, destinationUrl, bookingType, leg }) {
  return prisma.affiliateClick.create({
    data: {
      userId: userId || null,
      programme,
      destination: destinationUrl,
      bookingType,
      leg,
      commissionEst: null,
    },
  });
}

module.exports = { buildAffiliateUrl, recordClick, hotelAffiliateProgramme, AFFILIATE_CONFIG };
