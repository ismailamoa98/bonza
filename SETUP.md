# Bonza — Local Setup

Step-by-step instructions to run Bonza locally.

> **Phase 1 note:** This repo currently contains the project scaffold only.
> Application code (Express server, API endpoints, React UI) is implemented in
> later phases. The steps below describe the intended local workflow once that
> code exists; in Phase 1, stop after step 2 (the placeholders contain no logic yet).

## Prerequisites

- **Node.js** 18+ and npm
- **Docker** + Docker Compose (for local PostgreSQL)
- An **Anthropic API key** from <https://console.anthropic.com>

## 1. Start PostgreSQL

A local Postgres 15 instance is provided via Docker Compose:

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with:

| Setting  | Value       |
|----------|-------------|
| User     | `bonza`     |
| Password | `bonza_dev` |
| Database | `bonza`     |

Data persists in the `postgres_data` named volume. Stop it with
`docker compose down` (add `-v` to also wipe the volume).

## 2. Configure Environment

```bash
cp .env.example .env
```

Then edit `.env`:

- `DATABASE_URL` — already matches the Docker Postgres above; leave as-is for local dev.
- `ANTHROPIC_API_KEY` — paste your real key.
- `JWT_SECRET` — set to any long random string.
- `FRONTEND_URL` / `BACKEND_URL` — defaults are fine locally.

`.env` is gitignored and must never be committed. See **[ENVIRONMENT.md](ENVIRONMENT.md)** for the full
environment-variable reference (local `.env`, Secrets Manager, and CI secrets).

## 3. Install Dependencies

```bash
npm install
```

## 4. Set Up the Database

Push the Prisma schema to Postgres (creates tables):

```bash
npm run db:setup     # prisma db push
```

Seed initial data:

```bash
npm run db:seed
```

## 5. Run the App

```bash
npm run dev          # backend with nodemon auto-reload
# or
npm start            # backend, plain node
```

The backend listens on the port configured in `BACKEND_URL` (default `:5000`).

## Common Commands

| Command            | Description                          |
|--------------------|--------------------------------------|
| `docker compose up -d` | Start local PostgreSQL           |
| `npm install`      | Install dependencies                 |
| `npm run db:setup` | Push Prisma schema to the database   |
| `npm run db:seed`  | Load seed data                       |
| `npm run dev`      | Start backend in watch mode          |
| `npm start`        | Start backend                        |

## Troubleshooting

- **Port 5432 already in use:** another Postgres is running locally. Stop it, or
  change the host port mapping in `docker-compose.yml`.
- **Prisma can't connect:** confirm the container is up (`docker compose ps`) and
  that `DATABASE_URL` in `.env` matches the Compose credentials.
