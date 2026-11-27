// db/worldDirectory.js — Phase 18 world country directory (the Anywhere page browse catalog). ~60 countries
// grouped by region, each with a few real cities (IATA codes) a search can run to. Reference data, no
// migration. Photos aren't feasible at this scale, so the directory uses flag + a per-region gradient tile;
// prices are a region-tier mock "from £X". The curated countries (ExploreCountry + countryCities) keep their
// rich photo/package pages — this only supplies the directory listing and a fallback for country pages that
// aren't curated. Codes: country = ISO 3166-1 alpha-2; city = IATA.
const REGIONS = [
  {
    region: "Europe",
    gradient: "linear-gradient(160deg,#7FB3D0,#3D5A70)",
    baseCash: 620,
    countries: [
      { code: "gb", name: "United Kingdom", cities: [{ code: "LHR", name: "London" }, { code: "MAN", name: "Manchester" }, { code: "EDI", name: "Edinburgh" }] },
      { code: "fr", name: "France", cities: [{ code: "CDG", name: "Paris" }, { code: "NCE", name: "Nice" }, { code: "LYS", name: "Lyon" }] },
      { code: "es", name: "Spain", cities: [{ code: "BCN", name: "Barcelona" }, { code: "MAD", name: "Madrid" }, { code: "AGP", name: "Malaga" }] },
      { code: "it", name: "Italy", cities: [{ code: "FCO", name: "Rome" }, { code: "VCE", name: "Venice" }, { code: "MXP", name: "Milan" }] },
      { code: "pt", name: "Portugal", cities: [{ code: "LIS", name: "Lisbon" }, { code: "OPO", name: "Porto" }, { code: "FAO", name: "Faro" }] },
      { code: "gr", name: "Greece", cities: [{ code: "ATH", name: "Athens" }, { code: "JTR", name: "Santorini" }, { code: "HER", name: "Heraklion" }] },
      { code: "nl", name: "Netherlands", cities: [{ code: "AMS", name: "Amsterdam" }] },
      { code: "de", name: "Germany", cities: [{ code: "BER", name: "Berlin" }, { code: "MUC", name: "Munich" }, { code: "FRA", name: "Frankfurt" }] },
      { code: "ch", name: "Switzerland", cities: [{ code: "ZRH", name: "Zurich" }, { code: "GVA", name: "Geneva" }] },
      { code: "at", name: "Austria", cities: [{ code: "VIE", name: "Vienna" }] },
      { code: "ie", name: "Ireland", cities: [{ code: "DUB", name: "Dublin" }] },
      { code: "be", name: "Belgium", cities: [{ code: "BRU", name: "Brussels" }] },
      { code: "cz", name: "Czechia", cities: [{ code: "PRG", name: "Prague" }] },
      { code: "hr", name: "Croatia", cities: [{ code: "DBV", name: "Dubrovnik" }, { code: "SPU", name: "Split" }] },
      { code: "is", name: "Iceland", cities: [{ code: "KEF", name: "Reykjavik" }] },
      { code: "no", name: "Norway", cities: [{ code: "OSL", name: "Oslo" }] },
      { code: "se", name: "Sweden", cities: [{ code: "ARN", name: "Stockholm" }] },
      { code: "dk", name: "Denmark", cities: [{ code: "CPH", name: "Copenhagen" }] },
    ],
  },
  {
    region: "Middle East",
    gradient: "linear-gradient(160deg,#E3B778,#8A5A2E)",
    baseCash: 1200,
    countries: [
      { code: "ae", name: "United Arab Emirates", cities: [{ code: "DXB", name: "Dubai" }, { code: "AUH", name: "Abu Dhabi" }] },
      { code: "qa", name: "Qatar", cities: [{ code: "DOH", name: "Doha" }] },
      { code: "tr", name: "Turkey", cities: [{ code: "IST", name: "Istanbul" }, { code: "AYT", name: "Antalya" }] },
      { code: "il", name: "Israel", cities: [{ code: "TLV", name: "Tel Aviv" }] },
      { code: "jo", name: "Jordan", cities: [{ code: "AMM", name: "Amman" }] },
      { code: "om", name: "Oman", cities: [{ code: "MCT", name: "Muscat" }] },
    ],
  },
  {
    region: "Africa",
    gradient: "linear-gradient(160deg,#E8B489,#6A4A2E)",
    baseCash: 1600,
    countries: [
      { code: "za", name: "South Africa", cities: [{ code: "CPT", name: "Cape Town" }, { code: "JNB", name: "Johannesburg" }] },
      { code: "eg", name: "Egypt", cities: [{ code: "CAI", name: "Cairo" }, { code: "HRG", name: "Hurghada" }] },
      { code: "ma", name: "Morocco", cities: [{ code: "RAK", name: "Marrakesh" }, { code: "CMN", name: "Casablanca" }] },
      { code: "ke", name: "Kenya", cities: [{ code: "NBO", name: "Nairobi" }] },
      { code: "tz", name: "Tanzania", cities: [{ code: "JRO", name: "Kilimanjaro" }, { code: "ZNZ", name: "Zanzibar" }] },
      { code: "mu", name: "Mauritius", cities: [{ code: "MRU", name: "Port Louis" }] },
      { code: "sc", name: "Seychelles", cities: [{ code: "SEZ", name: "Mahé" }] },
      { code: "ng", name: "Nigeria", cities: [{ code: "LOS", name: "Lagos" }] },
    ],
  },
  {
    region: "Asia",
    gradient: "linear-gradient(160deg,#C9705C,#4E3238)",
    baseCash: 2000,
    countries: [
      { code: "jp", name: "Japan", cities: [{ code: "HND", name: "Tokyo" }, { code: "KIX", name: "Kyoto" }] },
      { code: "th", name: "Thailand", cities: [{ code: "BKK", name: "Bangkok" }, { code: "HKT", name: "Phuket" }, { code: "CNX", name: "Chiang Mai" }] },
      { code: "id", name: "Indonesia", cities: [{ code: "DPS", name: "Bali" }, { code: "CGK", name: "Jakarta" }] },
      { code: "sg", name: "Singapore", cities: [{ code: "SIN", name: "Singapore" }] },
      { code: "vn", name: "Vietnam", cities: [{ code: "SGN", name: "Ho Chi Minh City" }, { code: "HAN", name: "Hanoi" }] },
      { code: "my", name: "Malaysia", cities: [{ code: "KUL", name: "Kuala Lumpur" }] },
      { code: "ph", name: "Philippines", cities: [{ code: "MNL", name: "Manila" }, { code: "CEB", name: "Cebu" }] },
      { code: "in", name: "India", cities: [{ code: "DEL", name: "Delhi" }, { code: "BOM", name: "Mumbai" }, { code: "GOI", name: "Goa" }] },
      { code: "lk", name: "Sri Lanka", cities: [{ code: "CMB", name: "Colombo" }] },
      { code: "mv", name: "Maldives", cities: [{ code: "MLE", name: "Malé" }] },
      { code: "cn", name: "China", cities: [{ code: "PEK", name: "Beijing" }, { code: "PVG", name: "Shanghai" }] },
      { code: "hk", name: "Hong Kong", cities: [{ code: "HKG", name: "Hong Kong" }] },
      { code: "kr", name: "South Korea", cities: [{ code: "ICN", name: "Seoul" }] },
    ],
  },
  {
    region: "Americas",
    gradient: "linear-gradient(160deg,#7FB88A,#2E5B4E)",
    baseCash: 1600,
    countries: [
      { code: "us", name: "United States", cities: [{ code: "JFK", name: "New York" }, { code: "LAX", name: "Los Angeles" }, { code: "MIA", name: "Miami" }, { code: "SFO", name: "San Francisco" }] },
      { code: "ca", name: "Canada", cities: [{ code: "YYZ", name: "Toronto" }, { code: "YVR", name: "Vancouver" }] },
      { code: "mx", name: "Mexico", cities: [{ code: "CUN", name: "Cancún" }, { code: "MEX", name: "Mexico City" }] },
      { code: "br", name: "Brazil", cities: [{ code: "GIG", name: "Rio de Janeiro" }, { code: "GRU", name: "São Paulo" }] },
      { code: "ar", name: "Argentina", cities: [{ code: "EZE", name: "Buenos Aires" }] },
      { code: "pe", name: "Peru", cities: [{ code: "LIM", name: "Lima" }] },
      { code: "cl", name: "Chile", cities: [{ code: "SCL", name: "Santiago" }] },
      { code: "co", name: "Colombia", cities: [{ code: "BOG", name: "Bogotá" }] },
      { code: "cr", name: "Costa Rica", cities: [{ code: "SJO", name: "San José" }] },
      { code: "jm", name: "Jamaica", cities: [{ code: "MBJ", name: "Montego Bay" }] },
      { code: "cu", name: "Cuba", cities: [{ code: "HAV", name: "Havana" }] },
      { code: "bb", name: "Barbados", cities: [{ code: "BGI", name: "Bridgetown" }] },
    ],
  },
  {
    region: "Oceania",
    gradient: "linear-gradient(160deg,#79BECD,#265F7C)",
    baseCash: 2400,
    countries: [
      { code: "au", name: "Australia", cities: [{ code: "SYD", name: "Sydney" }, { code: "MEL", name: "Melbourne" }] },
      { code: "nz", name: "New Zealand", cities: [{ code: "AKL", name: "Auckland" }] },
      { code: "fj", name: "Fiji", cities: [{ code: "NAN", name: "Nadi" }] },
    ],
  },
];

// Deterministic per-country "from £" jitter so cards vary a little without hand-authoring 60 prices.
function fromCashFor(code, baseCash) {
  const jitter = [...code].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 5;
  return baseCash + jitter * 45;
}

// Flat lookup code → { name, gradient, region, cities, fromCash } for the country endpoint fallback.
const DIRECTORY = {};
for (const r of REGIONS) {
  for (const c of r.countries) {
    DIRECTORY[c.code] = {
      name: c.name,
      gradient: r.gradient,
      region: r.region,
      cities: c.cities,
      fromCash: fromCashFor(c.code, r.baseCash),
    };
  }
}

module.exports = { REGIONS, DIRECTORY, fromCashFor };
