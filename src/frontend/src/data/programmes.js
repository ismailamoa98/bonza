// data/programmes.js — loyalty programme metadata. The full Phase 14 catalog (18), matching
// db/seedProgrammes.js / the ProgrammeValuation table the add-account endpoint validates against.
export const PROGRAMMES = [
  // Cards
  { key: "amex_mr", label: "Amex Membership Rewards" },
  { key: "chase_ur", label: "Chase Ultimate Rewards" },
  // Hotels
  { key: "marriott_bonvoy", label: "Marriott Bonvoy" },
  { key: "hilton_honors", label: "Hilton Honors" },
  { key: "world_of_hyatt", label: "World of Hyatt" },
  { key: "ihg_one", label: "IHG One Rewards" },
  // Airlines
  { key: "ba_avios", label: "British Airways Avios" },
  { key: "united_mp", label: "United MileagePlus" },
  { key: "virgin_flying_club", label: "Virgin Atlantic Flying Club" },
  { key: "aeroplan", label: "Air Canada Aeroplan" },
  { key: "flying_blue", label: "Air France KLM Flying Blue" },
  { key: "krisflyer", label: "Singapore KrisFlyer" },
  { key: "emirates_skywards", label: "Emirates Skywards" },
  { key: "aer_lingus", label: "Aer Lingus AerClub" },
  { key: "iberia_plus", label: "Iberia Plus" },
  // Car rental (status only — no points)
  { key: "hertz_gold", label: "Hertz Gold Plus Rewards" },
  { key: "avis_preferred", label: "Avis Preferred" },
  { key: "national_emerald", label: "National Emerald Club" },
];

export const programmeLabel = (key) =>
  PROGRAMMES.find((p) => p.key === key)?.label || String(key || "").replace(/_/g, " ");
