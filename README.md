# Caramba Online

A private, realtime multiplayer card game for 2–8 friends. Create a room, share a code or invite link, and play Caramba on a shared virtual table.

The rules in this repository are the source of truth. They are not imported from any other game named Caramba.

## Requirements

- Node.js 20 or newer
- npm
- Optional: a Supabase project for persistent multiplayer across multiple server instances

Local development and end-to-end tests work without Supabase. The app uses an in-memory store and server-sent events until Supabase credentials are provided.

## Installation

```bash
npm install
```

## Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | For hosted persistence | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For hosted persistence | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Never expose this to the browser |
| `CARAMBA_TEST_MODE` | Tests only | Set to `1` for Playwright helpers. Do not enable in production. |

## Supabase setup

Connect your Supabase account and apply the database in one step:

```bash
npm run supabase:link
```

Run it in your own terminal. It opens a browser so you can sign in. It then uses a project named `caramba-online` or `caramba`, or your only project. If you have several, set `SUPABASE_PROJECT_REF` and run it again. If you have none, it creates `caramba-online` in `eu-west-3` (override with `SUPABASE_REGION`).

You can also create a token at https://supabase.com/dashboard/account/tokens and run `SUPABASE_ACCESS_TOKEN=sbp_... npm run supabase:link`.

It writes `.env.local` with the project URL and API keys. Restart `npm run dev` afterward.

The server uses the service role key and never sends hidden hands to other clients. Do not commit `.env.local`.

Without those variables, the app still runs locally with an in-memory store. That store resets when the Node process restarts.

## Database migrations

The initial schema creates:

- `rooms`
- `players`
- `games` (authoritative JSONB state + version)
- `game_events`

Apply `supabase/migrations/001_init.sql` before pointing the app at Supabase.

## Local development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create a game in one browser, join from another with the room code, mark guests ready, and start.

## Unit tests

```bash
npm run test
```

These cover the deck, card values, sequences, same-rank groups, full-hand discard, Caramba, the 100-point rule, turn order, hidden-hand projection, and fresh decks each round.

## End-to-end tests

```bash
npm run test:e2e
```

Playwright starts the app with `CARAMBA_TEST_MODE=1` so the multiplayer flow can arrange known hands.

## Production build

```bash
npm run build
npm start
```

## Deployment

1. Deploy the Next.js app (Vercel or any Node host).
2. Set the environment variables.
3. Apply the Supabase migration if you want durable rooms across instances.
4. Do not set `CARAMBA_TEST_MODE` in production.
5. Never put `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_` variable.

For a single-instance hobby deploy, the in-memory store is enough for a private friends night. Use Supabase when you need persistence, reconnects across restarts, or more than one server.

## Architecture

- `lib/game` — pure, testable engine. No React, no network.
- `lib/server` — room/game service, cookies, locks, validation.
- `lib/store` — memory store or Supabase.
- `app/api` — authoritative mutations.
- `components` — table, cards, lobby, scoreboard.

Clients may request moves. The server validates identity, turn, ownership, combinations, draw rules, and Caramba, then broadcasts a per-player public projection.

## Current rule assumptions

1. A valid discard is 1 card, 2–5 of the same rank, or a 3–5 card same-color sequence.
2. A player may discard their entire hand if that hand is a legal combination.
3. After discarding, the player draws exactly 1 card.
4. A player may take 1 card from the immediately previous player's latest discard group.
5. A completed turn always ends with at least 1 card.
6. Ace may be low or high in sequences, but always scores 1.
7. A new 104-card deck is shuffled before every round.
8. Caramba can only be called with a hand total of 7 or less. A successful call scores 0.
9. Failed Caramba = hand value + 30.
10. Other active players receive their hand value.
11. Exactly 100 cumulative points becomes 50.
12. More than 100 eliminates the player.
13. The match ends when only one active player remains.
