// services/seatsAeroService.js — award flight availability via Seats.aero (mock unless env.hasSeatsAero).
const axios = require("axios");
const env = require("../config/env");
const { buildAffiliateUrl } = require("./affiliateService");

const SEATS_AERO_BASE = "https://seats.aero/partnerapi";

function generateLoyaltyDeepLink(programme, origin, destination, date) {
  const links = {
    aeroplan: `https://www.aircanada.com/aeroplan/redeem/availability/outbound?org0=${origin}&dest0=${destination}&departureDate0=${date}&ADT=1&YTH=0&CHD=0&INF=0&INS=0&lang=en-CA&tripType=O&cabinPreference=lowest`,
    united: `https://www.united.com/en/us/flightsearch/page?f=${origin}&t=${destination}&d=${date}&tt=1&sc=7&px=1&taxng=1&newHP=True&clm=7&st=bestmatches&fareFamily=economy`,
    ba_avios: `https://www.britishairways.com/travel/redeem/execclub/_gf/en_gb?eId=106012&tab_selected=redeem&redemption_type=STD_RED&departurePoint=${origin}&destinationPoint=${destination}&departureDate=${date}&CabinCode=F&Number_Adults=1`,
  };
  return links[programme] || null;
}

function wrapWithAffiliate(programme, url) {
  if (!url) return null;
  return buildAffiliateUrl("travelpayouts", url, "flight");
}

async function seatsAeroSearch({ origin, destination, cabin = "business", programmes }) {
  const response = await axios.get(`${SEATS_AERO_BASE}/search`, {
    params: {
      origin_airport: origin,
      destination_airport: destination,
      cabin,
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
    headers: {
      "Partner-Authorization": process.env.SEATS_AERO_API_KEY,
      Accept: "application/json",
    },
  });

  const availableSeats = response.data.data || [];
  return availableSeats
    .filter((seat) => !programmes || programmes.includes(seat.source))
    .map((seat) => ({
      programme: seat.source, // e.g. "aeroplan"
      date: seat.date,
      cabin: seat.cabin,
      pointsCost: seat.mileageCost,
      taxesGbp: seat.totalTaxes,
      seatsAvailable: seat.remainingSeats,
      bookingUrl: generateLoyaltyDeepLink(seat.source, origin, destination, seat.date),
      affiliateUrl: wrapWithAffiliate(seat.source, generateLoyaltyDeepLink(seat.source, origin, destination, seat.date)),
    }));
}

const MOCK_PROGRAMMES = [
  { source: "aeroplan", points: 60000, taxes: 180 },
  { source: "united", points: 80000, taxes: 95 },
  { source: "ba_avios", points: 100000, taxes: 350 },
];

function isoDateInDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function mockAwardFlights({ origin, destination, cabin = "business" }) {
  const awards = [];
  MOCK_PROGRAMMES.forEach((p, pi) => {
    [14, 35].forEach((offset, di) => {
      const date = isoDateInDays(offset);
      const bookingUrl = generateLoyaltyDeepLink(p.source, origin, destination, date);
      awards.push({
        programme: p.source,
        date,
        cabin,
        pointsCost: p.points + di * 5000,
        taxesGbp: p.taxes,
        seatsAvailable: 2 + ((pi + di) % 4),
        bookingUrl,
        affiliateUrl: wrapWithAffiliate(p.source, bookingUrl),
      });
    });
  });
  return awards;
}

function searchAwardFlights(params) {
  return env.hasSeatsAero ? seatsAeroSearch(params) : Promise.resolve(mockAwardFlights(params));
}

module.exports = { searchAwardFlights, generateLoyaltyDeepLink, wrapWithAffiliate };
