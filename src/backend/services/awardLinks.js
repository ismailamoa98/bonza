// services/awardLinks.js — real, keyless deep links to hotel-programme award searches and card-issuer
// point-transfer portals. Best-effort URLs (same spirit as the flight links in seatsAeroService): they
// pre-fill destination/dates and toggle points/award mode where the site supports it. No API keys, no
// booking happens here — Bonza hands the user off to the programme's own site.

const enc = (s) => encodeURIComponent(String(s || "").trim());

// Hotel award-search deep links with the points/redemption toggle on, pre-filled with city + dates.
// Unknown programme → null (caller falls back to a plain handoff message).
function hotelAwardLink(programme, { name, city, checkIn, checkOut, adults = 1 } = {}) {
  const q = enc(city || name || "");
  const a = Math.max(1, Number(adults) || 1);
  switch (programme) {
    case "marriott_bonvoy":
      return `https://www.marriott.com/search/submitSearch.mi?destinationAddress.destination=${q}&fromDate=${enc(checkIn)}&toDate=${enc(checkOut)}&numberOfRooms=1&numberOfAdults=${a}&useRewardsPoints=true`;
    case "hilton_honors":
      return `https://www.hilton.com/en/search/?query=${q}&arrivalDate=${enc(checkIn)}&departureDate=${enc(checkOut)}&room1NumAdults=${a}&redeemPts=true`;
    case "world_of_hyatt":
      return `https://www.hyatt.com/search/${q}?checkinDate=${enc(checkIn)}&checkoutDate=${enc(checkOut)}&rooms=1&adults=${a}&rate=Points`;
    case "ihg_one":
      return `https://www.ihg.com/hotels/us/en/find-hotels/hotel-search?qDest=${q}&qCiD=${enc(checkIn)}&qCoD=${enc(checkOut)}&qAdlt=${a}&qRms=1&qRewardsType=Points`;
    default:
      return null;
  }
}

// Buy-points pages — where the user purchases the shortfall to top up to a full award.
function buyPointsLink(programme) {
  switch (programme) {
    case "marriott_bonvoy":
      return "https://www.marriott.com/loyalty/earn/buyPoints.mi";
    case "hilton_honors":
      return "https://www.hilton.com/en/hilton-honors/points/buy-points/";
    case "world_of_hyatt":
      return "https://www.hyatt.com/en-US/member/buy-points";
    case "ihg_one":
      return "https://www.ihg.com/rewardsclub/us/en/redeem/points-and-cash/buy-points";
    default:
      return null;
  }
}

// Card-issuer point-transfer portals (where the user actually moves transferable currency to a partner).
function issuerTransferLink(fromProgramme) {
  switch (fromProgramme) {
    case "amex_mr":
      return "https://global.americanexpress.com/rewards/transfer-points";
    case "chase_ur":
      return "https://ultimaterewardspoints.chase.com/";
    default:
      return null;
  }
}

module.exports = { hotelAwardLink, buyPointsLink, issuerTransferLink };
