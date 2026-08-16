// data/programmes.js — loyalty programme metadata.
export const PROGRAMMES = [
  { key: "marriott_bonvoy", label: "Marriott Bonvoy" },
  { key: "hilton_honors", label: "Hilton Honors" },
  { key: "world_of_hyatt", label: "World of Hyatt" },
  { key: "ihg_one", label: "IHG One Rewards" },
  { key: "amex_mr", label: "Amex Membership Rewards" },
  { key: "chase_ur", label: "Chase Ultimate Rewards" },
  { key: "united_mp", label: "United MileagePlus" },
  { key: "ba_avios", label: "British Airways Avios" },
];

export const programmeLabel = (key) =>
  PROGRAMMES.find((p) => p.key === key)?.label || String(key || "").replace(/_/g, " ");
