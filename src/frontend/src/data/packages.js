// data/packages.js — Mock travel packages + image/shuffle helpers.
// Presentational deck data for the public homepage. The same PackageCard will
// later render real, logged-in search results — keep this purely as sample data.

// Leave empty to use keyless LoremFlickr (real Creative-Commons photos, works out
// of the box). Set an Unsplash access key to fetch higher-quality random photos.
export const UNSPLASH_KEY = "";

// Synchronous image URL — keyless LoremFlickr. `seed` locks a photo so it's stable
// per render but varies when the deck is reshuffled.
export function imageUrl(query, seed) {
  return `https://loremflickr.com/640/420/${encodeURIComponent(query)}?lock=${seed}`;
}

// Optional async upgrade: if an Unsplash key is set, fetch a random landscape photo
// for the query and fall back to LoremFlickr on any error.
export async function fetchImage(query, seed) {
  if (!UNSPLASH_KEY) return imageUrl(query, seed);
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?orientation=landscape&query=${encodeURIComponent(
        query
      )}&client_id=${UNSPLASH_KEY}`
    );
    if (!res.ok) throw new Error(`Unsplash ${res.status}`);
    const data = await res.json();
    return data?.urls?.regular || imageUrl(query, seed);
  } catch {
    return imageUrl(query, seed);
  }
}

// Fisher–Yates — returns a new shuffled array (never mutates the input/export).
export function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const PACKAGES = [
  {
    city: "Lisbon Escape",
    query: "lisbon,portugal",
    grad: "linear-gradient(135deg,#F2B07A,#D9763F)",
    loyalty: "Marriott Bonvoy",
    desc: "7 nts · 5-star · TAP Air Portugal",
    hotel: "Marriott Lisbon Hotel",
    stars: "5-star",
    dates: "Jun 23 - Jul 1",
    cash: "£1,240",
    was: "£1,680",
    save: "£440",
    pts: "215,000 Bonvoy · 1.4¢/pt",
    rec: "Pay cash — save points for peak season",
    rate: "9.1 Excellent",
  },
  {
    city: "Barcelona Weekend",
    query: "barcelona,spain",
    grad: "linear-gradient(135deg,#E8956B,#C25E36)",
    loyalty: "BA Executive Club",
    desc: "4 nts · 4-star · British Airways",
    hotel: "Hotel Barcelona Center",
    stars: "4-star",
    dates: "Jul 5 - Jul 9",
    cash: "£720",
    was: "£980",
    save: "£260",
    pts: "50,000 Avios + £140 · 1.6¢/pt",
    rec: "Use Avios — superb 1.6¢/pt value",
    rate: "8.7 Great",
  },
  {
    city: "French Riviera",
    query: "nice,france",
    grad: "linear-gradient(135deg,#6FB7D4,#3D7EA6)",
    loyalty: "World of Hyatt",
    desc: "5 nts · 5-star · easyJet",
    hotel: "Hyatt Regency Nice",
    stars: "5-star",
    dates: "Aug 12 - Aug 17",
    cash: "£1,520",
    was: "£2,400",
    save: "£880",
    pts: "90,000 Hyatt · 1.8¢/pt",
    rec: "Use points — exceptional 1.8¢/pt value",
    rate: "9.4 Exceptional",
  },
  {
    city: "Rome Getaway",
    query: "rome,italy",
    grad: "linear-gradient(135deg,#D8A15E,#B06B2E)",
    loyalty: "Hilton Honors",
    desc: "6 nts · 4-star · ITA Airways",
    hotel: "Hilton Garden Inn Rome",
    stars: "4-star",
    dates: "Sep 3 - Sep 9",
    cash: "£1,080",
    was: "£1,460",
    save: "£380",
    pts: "240,000 Hilton · 0.5¢/pt",
    rec: "Pay cash — Hilton points are weak here",
    rate: "8.9 Great",
  },
  {
    city: "Tokyo Discovery",
    query: "tokyo,japan",
    grad: "linear-gradient(135deg,#E2738F,#B23A66)",
    loyalty: "ANA Mileage Club",
    desc: "8 nts · 4-star · ANA",
    hotel: "ANA InterContinental Tokyo",
    stars: "4-star",
    dates: "Oct 1 - Oct 9",
    cash: "£2,150",
    was: "£3,100",
    save: "£950",
    pts: "120,000 ANA · 2.1¢/pt",
    rec: "Use miles — outstanding 2.1¢/pt value",
    rate: "9.6 Exceptional",
  },
  {
    city: "Dubai Luxury",
    query: "dubai",
    grad: "linear-gradient(135deg,#E8B96B,#C98A2E)",
    loyalty: "Emirates Skywards",
    desc: "5 nts · 5-star · Emirates",
    hotel: "Address Downtown Dubai",
    stars: "5-star",
    dates: "Nov 10 - Nov 15",
    cash: "£1,690",
    was: "£2,250",
    save: "£560",
    pts: "105,000 Skywards · 1.5¢/pt",
    rec: "Split — miles for flight, cash for hotel",
    rate: "9.0 Excellent",
  },
  {
    city: "Bali Retreat",
    query: "bali,beach",
    grad: "linear-gradient(135deg,#5FB89A,#2E8B6B)",
    loyalty: "Singapore KrisFlyer",
    desc: "9 nts · 5-star · Singapore Airlines",
    hotel: "The Mulia Bali",
    stars: "5-star",
    dates: "Jan 12 - Jan 21",
    cash: "£2,480",
    was: "£3,400",
    save: "£920",
    pts: "138,000 KrisFlyer · 1.7¢/pt",
    rec: "Use miles — great 1.7¢/pt value",
    rate: "9.3 Exceptional",
  },
  {
    city: "Reykjavik Aurora",
    query: "reykjavik,iceland",
    grad: "linear-gradient(135deg,#8A9BD4,#4A5BA6)",
    loyalty: "Icelandair Saga Club",
    desc: "4 nts · 4-star · Icelandair",
    hotel: "Hotel Borg Reykjavik",
    stars: "4-star",
    dates: "Feb 8 - Feb 12",
    cash: "£960",
    was: "£1,290",
    save: "£330",
    pts: "40,000 Saga · 1.3¢/pt",
    rec: "Pay cash — keep points flexible",
    rate: "8.5 Great",
  },
];
