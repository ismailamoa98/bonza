// services/gondolaService.js — award hotel cash+points pricing (offline surface; real path via Claude MCP).
const { getHotels } = require("../utils/mockHotels");
const { PROGRAMME_VALUATIONS } = require("./emailLoyaltySync");
const { buildAffiliateUrl, hotelAffiliateProgramme } = require("./affiliateService");

const PROGRAMME_BY_KEY = {
  marriott: "marriott_bonvoy",
  hilton: "hilton_honors",
  hyatt: "world_of_hyatt",
  ihg: "ihg_one",
};

const round2 = (n) => Math.round(n * 100) / 100;

const isoDate = (v) => {
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch (_err) {
    return "";
  }
};

function generateHotelDeepLink(programme, location, checkIn, checkOut) {
  const ci = isoDate(checkIn);
  const co = isoDate(checkOut);
  const where = encodeURIComponent(location || "");
  const links = {
    marriott_bonvoy: `https://www.marriott.com/search/findHotels.mi?destinationAddress.destination=${where}&fromDate=${ci}&toDate=${co}&useRewardsPoints=true`,
    hilton_honors: `https://www.hilton.com/en/search/?query=${where}&arrivalDate=${ci}&departureDate=${co}&redeemPts=true`,
    world_of_hyatt: `https://www.hyatt.com/search/${where}?checkinDate=${ci}&checkoutDate=${co}&rooms=1&pointsRedemption=true`,
    ihg_one: `https://www.ihg.com/hotels/us/en/find-hotels/hotel/list?qDest=${where}&qCiD=${ci}&qCoD=${co}&qRtP=IVANI`,
  };
  return links[programme] || null;
}

function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1;
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

function toAwardHotel(h, nights, programmes, { location, checkIn, checkOut } = {}) {
  const cashTotal = h.pricePerNight * nights;
  const held = programmes && programmes.length ? new Set(programmes) : null;

  const options = Object.entries(h.loyaltyPrograms).map(([key, info]) => {
    const programme = PROGRAMME_BY_KEY[key] || key;
    const pointsCost = info.pointsPerNight * nights;
    const rate = PROGRAMME_VALUATIONS[programme] || 0.005; // £ per point
    const centsPerPoint = round2((cashTotal / pointsCost) * 100);
    const bookingUrl = generateHotelDeepLink(programme, location, checkIn, checkOut);
    return {
      programme,
      programmeName: info.program,
      pointsCost,
      gbpValue: round2(pointsCost * rate),
      centsPerPoint,
      held: held ? held.has(programme) : null,
      bookingUrl,
      affiliateUrl: buildAffiliateUrl(hotelAffiliateProgramme(programme), bookingUrl, "hotel"),
    };
  });

  const bestPath = options.reduce((best, o) => (!best || o.centsPerPoint > best.centsPerPoint ? o : best), null);

  return {
    hotelId: h.id,
    name: h.name,
    city: h.city,
    stars: h.stars,
    nights,
    cashTotal,
    currency: "GBP",
    options,
    bestPath,
  };
}

async function searchAwardHotels({ location, checkIn, checkOut, programmes }) {
  const nights = nightsBetween(checkIn, checkOut);
  return getHotels(location, checkIn)
    .slice(0, 20)
    .map((h) => toAwardHotel(h, nights, programmes, { location, checkIn, checkOut }));
}

async function getHotelDetails({ hotelId, location, checkIn, checkOut, programmes }) {
  const nights = nightsBetween(checkIn, checkOut);
  const hotel = getHotels(location, checkIn).find((h) => h.id === hotelId);
  return hotel ? toAwardHotel(hotel, nights, programmes, { location, checkIn, checkOut }) : null;
}

module.exports = { searchAwardHotels, getHotelDetails };
