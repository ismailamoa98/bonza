# Bonza - AI Travel Optimizer

Optimizing travel with loyalty points.

Bonza is an AI-powered travel optimization app. Users enter their trip details and
loyalty-point balances, and Claude generates **5 optimization scenarios** (transfer,
status, cash, hybrid, direct). Each scenario produces a unique booking link with
affiliate tracking so conversions can be measured.

## Tech Stack

- **Frontend:** React 18, Tailwind CSS, Zustand, React Router, Axios
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** JWT + bcrypt
- **AI:** Claude API (travel recommendation engine)
- **APIs:** Mock during development (Plaid, Amadeus, Booking.com, Hertz); real post-launch

## Quick Start

```bash
# 1. Start local PostgreSQL
docker compose up -d

# 2. Configure environment
cp .env.example .env
# then edit .env and set ANTHROPIC_API_KEY and JWT_SECRET

# 3. Install dependencies
npm install

# 4. Push the schema to the database
npm run db:setup

# 5. Seed initial data
npm run db:seed

# 6. Run the backend (dev mode with reload)
npm run dev
```

See [SETUP.md](./SETUP.md) for detailed, step-by-step instructions.

## Architecture Overview

```
src/
├── backend/         # Express API + Prisma + Claude optimization engine
│   ├── server.js    # Express entry point
│   ├── config/      # database, env, constants
│   ├── db/          # Prisma schema, migrations, seed
│   ├── api/         # trips, plaid (mock), optimize, chat, booking, conversion, tracking
│   ├── middleware/  # auth (JWT), error handling, CORS
│   └── utils/       # Claude optimizer, affiliate link generator, mock data
└── frontend/        # React 3-step flow (trip details → optimization → booking)
    └── src/         # pages (Step1/2/3), components, hooks, utils, Zustand store
```

**Data model:** `User → Trip → Scenario`, a `ChatSession`/`ChatMessage` advisor
thread, and `BookingLink` tying it together with per-type `AffiliateLink` and
`Conversion` records. See `src/backend/db/schema.prisma`.

## Project Status

This repository is being built in phases:

- **Phase 1 — Architecture & Setup** ✅ (this scaffold)
- Phase 2 — Backend development
- Phase 3 — Frontend development
- Phase 4 — Integration & testing
- Phase 5 — Deployment
- Phase 6 — Refinements
