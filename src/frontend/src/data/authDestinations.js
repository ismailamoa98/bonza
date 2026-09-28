// data/authDestinations.js — destination photos shared by the auth pages (slideshow) and the homepage
// hero backdrop. `grad` is the fallback backdrop shown while the image loads or if it fails, so a panel is
// never a black block. Images are self-hosted in public/auth/ (swap for licensed assets before production).
export const AUTH_DESTINATIONS = [
  {
    slug: "amalfi",
    name: "Amalfi Coast, Italy",
    image: "/auth/amalfi.jpg",
    grad: "linear-gradient(160deg,#E8A87C,#5B7C8D)",
  },
  {
    slug: "maldives",
    name: "Maldives",
    image: "/auth/maldives.jpg",
    grad: "linear-gradient(160deg,#7EC8D8,#2A6B8A)",
  },
  {
    slug: "santorini",
    name: "Santorini, Greece",
    image: "/auth/santorini.jpg",
    grad: "linear-gradient(160deg,#F0B89C,#3D5A80)",
  },
  {
    slug: "dubai",
    name: "Dubai, UAE",
    image: "/auth/dubai.jpg",
    grad: "linear-gradient(160deg,#E3B778,#3A5A78)",
  },
  {
    slug: "bali",
    name: "Bali, Indonesia",
    image: "/auth/bali.jpg",
    grad: "linear-gradient(160deg,#7FB88A,#2E6B5E)",
  },
  {
    slug: "capetown",
    name: "Cape Town, South Africa",
    image: "/auth/capetown.jpg",
    grad: "linear-gradient(160deg,#F2C094,#4A6572)",
  },
  {
    slug: "kyoto",
    name: "Kyoto, Japan",
    image: "/auth/kyoto.jpg",
    grad: "linear-gradient(160deg,#D4735E,#5A4A3F)",
  },
  {
    slug: "banff",
    name: "Banff, Canada",
    image: "/auth/banff.jpg",
    grad: "linear-gradient(160deg,#8FC4D4,#3B5A52)",
  },
];

export const SLIDE_DURATION_MS = 5000;
