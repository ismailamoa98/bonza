// utils/recToPackage.js — map a PersonalisedRecommendation row to a PackageCard shape.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const RATING_WORD = {
  excellent: "Exceptional",
  good: "Great",
  typical: "Good",
  below_average: "Fair",
};

const GRADIENTS = [
  "linear-gradient(135deg,#F2B07A,#D9763F)",
  "linear-gradient(135deg,#E8956B,#C25E36)",
  "linear-gradient(135deg,#6FB7D4,#3D7EA6)",
  "linear-gradient(135deg,#D8A15E,#B06B2E)",
  "linear-gradient(135deg,#E2738F,#B23A66)",
  "linear-gradient(135deg,#5FB89A,#2E8B6B)",
];

const PROGRAMME_SHORT = {
  aeroplan: "Aeroplan",
  united: "United",
  ba_avios: "Avios",
  marriott_bonvoy: "Bonvoy",
  hilton_honors: "Hilton",
  world_of_hyatt: "Hyatt",
  ihg_one: "IHG",
  amex_mr: "Amex MR",
  chase_ur: "Chase UR",
  united_mp: "United",
};

function hash(str) {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) % 997;
  return h;
}

const fmtGbp = (n) => `£${Math.round(Number(n) || 0).toLocaleString()}`;

function dateRange(availableDates) {
  const start = availableDates?.[0] ? new Date(availableDates[0]) : new Date(Date.now() + 30 * 864e5);
  if (Number.isNaN(start.getTime())) return "";
  const end = new Date(start.getTime() + 5 * 864e5);
  const label = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return `${label(start)} - ${label(end)}`;
}

function imageQuery(rec) {
  return String(rec.destination || rec.destinationCity || "travel")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export function recToPackage(rec) {
  const pts = rec.pointsOption;
  const cash = rec.cashOption || {};
  const priceGbp = Number(cash.priceGbp) || 0;
  const saving = Number(rec.cashSavingGbp) || 0;

  const ptsLine = pts
    ? `${Number(pts.pointsCost).toLocaleString()} ${PROGRAMME_SHORT[pts.programme] || pts.programme} · ${rec.centsPerPoint}¢/pt`
    : "";

  return {
    id: rec.id,
    city: rec.destinationCity || rec.destination,
    query: imageQuery(rec),
    grad: GRADIENTS[hash(rec.destination) % GRADIENTS.length],

    desc: rec.specLine,
    dates: dateRange(pts?.availableDates),
    loyalty: pts ? PROGRAMME_SHORT[pts.programme] || pts.programme : "Cash",
    pts: ptsLine,
    rec: rec.aiInsight,
    rate: `${(rec.rating ?? 8).toFixed(1)} ${RATING_WORD[rec.pointsValueRating] || "Good"}`,

    cash: fmtGbp(priceGbp),
    was: fmtGbp(priceGbp + saving),
    save: fmtGbp(saving),

    whyPersonalised: rec.whyPersonalised || null,
    urgencySignal: rec.urgencySignal || null,
    creditsIfCash: rec.creditsIfCash != null ? Number(rec.creditsIfCash) : null,
    bookingUrl: pts?.bookingUrl || null,
    offerId: cash.offerId || null,
  };
}
