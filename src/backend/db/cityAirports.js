// db/cityAirports.js — reference: the airports serving each Explore city, for metros with more than one.
// Keyed by the city's primary IATA (ExploreCity.iataCode); the first entry is the primary. Cities absent here
// have a single airport (that primary code) — airportsFor() returns it with a null name so the UI shows just
// the code. Names are the common airport names (ASCII-only to avoid encoding surprises in chips).
const CITY_AIRPORTS = {
  LHR: [["LHR", "Heathrow"], ["LGW", "Gatwick"], ["STN", "Stansted"], ["LTN", "Luton"], ["LCY", "City"]],
  CDG: [["CDG", "Charles de Gaulle"], ["ORY", "Orly"], ["BVA", "Beauvais"]],
  MXP: [["MXP", "Malpensa"], ["LIN", "Linate"], ["BGY", "Bergamo"]],
  FCO: [["FCO", "Fiumicino"], ["CIA", "Ciampino"]],
  VCE: [["VCE", "Marco Polo"], ["TSF", "Treviso"]],
  JFK: [["JFK", "John F. Kennedy"], ["EWR", "Newark"], ["LGA", "LaGuardia"]],
  HND: [["HND", "Haneda"], ["NRT", "Narita"]],
  KIX: [["KIX", "Kansai"], ["ITM", "Osaka Itami"]],
  BKK: [["BKK", "Suvarnabhumi"], ["DMK", "Don Mueang"]],
  IST: [["IST", "Istanbul"], ["SAW", "Sabiha Gokcen"]],
  LAX: [["LAX", "Los Angeles Intl"], ["BUR", "Hollywood Burbank"], ["LGB", "Long Beach"], ["SNA", "John Wayne"]],
  SFO: [["SFO", "San Francisco Intl"], ["OAK", "Oakland"], ["SJC", "San Jose"]],
  MIA: [["MIA", "Miami Intl"], ["FLL", "Fort Lauderdale"]],
  MEX: [["MEX", "Benito Juarez"], ["NLU", "Felipe Angeles"]],
  GRU: [["GRU", "Guarulhos"], ["CGH", "Congonhas"], ["VCP", "Viracopos"]],
  GIG: [["GIG", "Galeao"], ["SDU", "Santos Dumont"]],
  EZE: [["EZE", "Ezeiza"], ["AEP", "Aeroparque"]],
  PEK: [["PEK", "Capital"], ["PKX", "Daxing"]],
  PVG: [["PVG", "Pudong"], ["SHA", "Hongqiao"]],
  ICN: [["ICN", "Incheon"], ["GMP", "Gimpo"]],
  DXB: [["DXB", "Dubai Intl"], ["DWC", "Al Maktoum"]],
  MEL: [["MEL", "Tullamarine"], ["AVV", "Avalon"]],
  OSL: [["OSL", "Gardermoen"], ["TRF", "Sandefjord Torp"]],
  ARN: [["ARN", "Arlanda"], ["BMA", "Bromma"], ["NYO", "Skavsta"]],
  BRU: [["BRU", "Brussels"], ["CRL", "Charleroi"]],
  KUL: [["KUL", "Kuala Lumpur Intl"], ["SZB", "Subang"]],
  CGK: [["CGK", "Soekarno-Hatta"], ["HLP", "Halim"]],
  MNL: [["MNL", "Ninoy Aquino"], ["CRK", "Clark"]],
  JNB: [["JNB", "O. R. Tambo"], ["HLA", "Lanseria"]],
  BCN: [["BCN", "El Prat"], ["GRO", "Girona"], ["REU", "Reus"]],
  FRA: [["FRA", "Frankfurt"], ["HHN", "Frankfurt-Hahn"]],
};

// Always returns at least the primary airport. Multi-airport metros carry names; single-airport cities
// return one entry with a null name (the UI shows the bare code).
function airportsFor(iataCode, cityName) {
  const entry = CITY_AIRPORTS[iataCode];
  if (entry) return entry.map(([code, name]) => ({ code, name, primary: code === iataCode }));
  return [{ code: iataCode, name: null, primary: true }];
}

module.exports = { CITY_AIRPORTS, airportsFor };
