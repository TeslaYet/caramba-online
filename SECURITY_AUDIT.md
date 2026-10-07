# Carramba Online security audit

Audit date: 5 October 2026. Later product work (accounts, rankings, consent, inactive ads and billing) is described in `docs/legal-compliance-audit.md` and `docs/legal-launch-readiness.md`. This file is the 5 October hardening note, not a description of everything the app does now.

The live site is https://www.carramba.online. This pass hardens the anonymous multiplayer game.

## Executive summary

Overall posture after this pass: **MEDIUM**.

Before this pass the game engine was already authoritative: scores, decks, turns, and Carramba results are calculated on the server, and responses go through `getPublicGameStateForPlayer`. The database is not readable with the public Supabase key alone.

The serious hole was identity. The browser cookie was the raw player id, and that same id is shown to everyone at the table. Anyone who copied it could act as that player, including seeing their hidden hand. That is fixed: the cookie is now an HMAC that the server verifies. A copied player id is not a session.

What remains is abuse resistance on a public anonymous game (rate limits are per server instance) and a public Supabase broadcast channel that carries only a timestamp. Those are not enough to call the posture high, and they are not a hidden-card or state-tampering hole.

`CARAMBA_THRESHOLD = 7` is a **confirmed intentional rule**. It is enforced in `GAME_RULES.CARAMBA_MAX_HAND`, `canCallCaramba`, the rules page, and the action bar. It was not changed.

## Architecture

```text
Browser
  signed httpOnly cookie, nickname is display-only
    ↓
Next.js routes (no server actions)
  origin check, body limit, rate limit, Cache-Control: private, no-store
    ↓
Room service + room lock + game version
  host checks live in assertHost
    ↓
Pure game engine (lib/game)
  no React, no network, crypto shuffle
    ↓
Projection
  other hands null until round end or game over
    ↓
Memory store, or Supabase via the server-only secret header
```

Identity, session, player, and profile stay separate. The engine does not know about accounts. A future account can be linked to the player id inside the signed session without teaching the engine about email or passwords.

Realtime is server-sent events. The browser does not subscribe to Supabase. The server publishes a timestamp on `room:{code}` so other instances refetch and send a fresh projection.

## Attack surface

Public pages: `/`, `/rules`, `/lobby/create`, `/lobby/join`, `/room/[code]`, `/game/[id]`.

API:

| Method | Path | Auth |
|---|---|---|
| POST | `/api/rooms` | signed session, origin, create limit |
| POST | `/api/rooms/join` | signed session, origin, join limit |
| GET | `/api/rooms/[code]` | room code is the invite; hands projected |
| GET | `/api/rooms/[code]/events` | same, then live snapshots |
| POST | `/api/rooms/[code]/actions` | signed session, membership or host, action limit |
| GET | `/api/game/[id]` | signed session must be a player in that game |
| POST | `/api/test/arrange` | 403 unless `CARAMBA_TEST_MODE=1` |

There are no server actions, no storage buckets, and no RPCs in `public`. The only database function is `private.request_authorized()`, which returns a boolean and does not reveal the secret.

Tables: `rooms`, `players`, `games`, `game_events`. `games.state` holds the full authoritative state, including hands. Grants exist for `anon`, and RLS allows a row only when the request header matches `private.server_auth`. The header is set only by the server client.

User-controlled input: nickname, room code, chat text, card ids, action type.

## Invariants

- A player cannot perform another player's action. The session cookie, not the request body, chooses the actor.
- A player cannot reveal another player's hidden hand. Projection omits it, and events are stripped of card ids.
- A player cannot submit a score, a deck order, a winner, or a drawn card.
- A card is played only if it is in that player's hand. The engine rejects anything else.
- Drawing takes the next server-side card. The client does not choose it.
- Shuffle uses `crypto.randomInt`, not `Math.random`.
- A completed round is a new state with a higher version. Replaying the same action hits the turn and phase checks or the version check.
- Host actions (start, kick, close, rematch, return to lobby) require `assertHost`.
- A nickname is not an identity.

## Findings

### SEC-01

- ID: SEC-01
- Severity: HIGH
- Category: broken authentication / impersonation
- Location: `lib/server/session.ts` (before this pass)
- Description: `caramba_pid` stored the raw player UUID. The same UUID is returned to every client at the table.
- Attack scenario: copy another player's id from the room snapshot and set it as your cookie. The server then treats you as that player, including their turn and their hidden hand.
- Impact: impersonation and hidden-hand disclosure.
- Likelihood: high for anyone in the room.
- Current protection: none before this pass. The cookie was HttpOnly, which does not stop someone from setting their own cookie.
- Recommended fix: sign the cookie.
- Status: fixed. `lib/server/session-token.ts` issues `v1.payload.hmac`. Raw UUIDs are rejected. Existing cookies from before this deploy are no longer valid, so current tables need a rejoin.

### SEC-02

- ID: SEC-02
- Severity: HIGH
- Category: broken access control
- Location: `nextRound` in `lib/server/game-service.ts`
- Description: starting the next round did not check that the caller was in the game.
- Attack scenario: anyone who knows the room code can POST `NEXT_ROUND` during the countdown and reshuffle the round.
- Impact: griefing a live round.
- Likelihood: medium. The code is the invite secret, but it is shared on purpose.
- Current protection: the engine only checked that the status was `ROUND_END`.
- Recommended fix: require membership.
- Status: fixed via `assertGameMember`.

### SEC-03

- ID: SEC-03
- Severity: MEDIUM
- Category: sensitive response caching
- Location: room and game GET handlers
- Description: a response contains the viewer's own hand. A shared cache that ignored cookies could serve one player's hand to another.
- Attack scenario: a cache stores `GET /api/rooms/CODE` and replays it.
- Impact: hidden-hand disclosure if a shared cache exists.
- Likelihood: low on the current Vercel setup because the handlers read cookies, but the header was not explicit.
- Current protection: dynamic rendering.
- Recommended fix: `Cache-Control: private, no-store` and `Vary: Cookie`.
- Status: fixed.

### SEC-04

- ID: SEC-04
- Severity: MEDIUM
- Category: IDOR
- Location: `GET /api/game/[id]`
- Description: knowing a game UUID returned that game's public projection to any cookie.
- Attack scenario: use a game id from a leaked URL. During play, hands stayed hidden. At round end, hands are meant to be revealed.
- Impact: limited. The game id is already inside the room snapshot.
- Likelihood: low.
- Current protection: projection.
- Recommended fix: require the signed session to belong to a player in that game.
- Status: fixed.

### SEC-05

- ID: SEC-05
- Severity: MEDIUM
- Category: CSRF
- Location: cookie-authenticated POST routes
- Description: `SameSite=Lax` already blocks most cross-site POSTs from attaching the cookie. There was no origin check.
- Attack scenario: an older browser sends the cookie on a cross-site POST.
- Impact: actions as the victim.
- Likelihood: low on current browsers.
- Current protection: `SameSite=Lax`, `Secure` in production, `HttpOnly`.
- Recommended fix: reject a foreign `Origin` or `Sec-Fetch-Site: cross-site`.
- Status: fixed in `assertSameOrigin`.

### SEC-06

- ID: SEC-06
- Severity: MEDIUM
- Category: abuse
- Location: room create, join, chat, and actions
- Description: no server-side rate limits.
- Attack scenario: scripted room creation, join guessing, or chat flood.
- Impact: noise and database growth. Room codes are 6 characters from a 32-symbol alphabet (about 1 billion values), so guessing is not practical at the new join limit.
- Likelihood: medium for a public site.
- Current protection: nickname length and chat length only.
- Recommended fix: in-memory windows. Create: 8 per hour per IP. Join: 30 per 10 minutes per IP. Chat: 12 per minute per player. Actions: 90 per minute per player.
- Status: fixed for a single server instance. On Vercel each instance has its own window, so this is a brake, not a global quota.

### SEC-07

- ID: SEC-07
- Severity: MEDIUM
- Category: security headers / clickjacking
- Location: `next.config.ts`
- Description: responses had no framing or content-type protection.
- Attack scenario: embed the game in an attacker page and trick a click.
- Impact: clickjacking. Not hidden-card theft.
- Likelihood: low.
- Current protection: none.
- Recommended fix: `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, referrer policy, permissions policy, HSTS.
- Status: fixed. CSP allows `'unsafe-inline'` for scripts because Next.js hydration injects inline scripts and this app does not use a nonce. `unsafe-eval` is not allowed. `connect-src` is `'self'` only. A future ad script must be added as an explicit host, not `*`.

### SEC-08

- ID: SEC-08
- Severity: LOW
- Category: input handling
- Location: nicknames and chat
- Description: control characters and bidi overrides were accepted. React renders chat as text, so this was not XSS.
- Attack scenario: a nickname that visually spoofs another player.
- Impact: confusion.
- Likelihood: low.
- Current protection: React text rendering, 16-character nicknames, 240-character chat.
- Recommended fix: strip control and bidi characters.
- Status: fixed.

### SEC-09

- ID: SEC-09
- Severity: LOW
- Category: event leakage
- Location: `getPublicGameStateForPlayer`
- Description: `sanitizeEventPayload` existed but the public event list was copied through unchanged. Current engine payloads do not include cards. A later change could leak one.
- Attack scenario: a draw event starts including `cardId`.
- Impact: none today.
- Likelihood: low.
- Current protection: payloads are currently metadata only.
- Recommended fix: always run events through `sanitizeEventPayload`, and hide `roundResult` until hands are intentionally revealed.
- Status: fixed.

### SEC-10

- ID: SEC-10
- Severity: INFO
- Category: database
- Location: Supabase RLS
- Description: `anon` can attempt to read `games.state`, which contains every hand. RLS returns no rows unless `x-caramba-secret` matches the server secret. The secret is not a `NEXT_PUBLIC_` variable.
- Attack scenario: call the Supabase REST API with the public anon key.
- Impact: none while the secret stays server-side.
- Likelihood: tested. The security test selects and inserts with the anon key and is denied.
- Current protection: RLS plus no grants of the secret to the browser.
- Recommended fix: keep it. Do not move the secret into a public env var.
- Status: accepted. Executable test in `tests/unit/security.test.ts`.

### SEC-11

- ID: SEC-11
- Severity: LOW
- Category: realtime
- Location: `SupabaseStore.publish`
- Description: the broadcast payload is `{ at: timestamp }`. The public anon key can hear or send that ping. It cannot read `games.state` through it.
- Attack scenario: spam the channel so servers refetch.
- Impact: extra reads, not card disclosure.
- Likelihood: low.
- Current protection: clients do not open the channel; only the server does. RLS blocks table reads.
- Recommended fix: leave as is until a private-channel change can be tested without breaking live updates.
- Status: accepted.

### SEC-12

- ID: SEC-12
- Severity: INFO
- Category: dependencies
- Description: `npm audit` reports issues in `vitest` and in `braces` via `eslint-config-next`. Both are development tools. `npm audit fix --force` would downgrade Vitest or ESLint and break the toolchain.
- Status: accepted. Not upgraded.

### SEC-13

- ID: SEC-13
- Severity: INFO
- Category: secrets
- Description: no live API keys or database passwords are tracked in git. `.env.local` is gitignored. `README.md` and `scripts/link-supabase.mjs` mention the `sbp_` token prefix as instructions, not a real token.
- Status: no rotation required from this audit.

### SEC-14

- ID: SEC-14
- Severity: INFO
- Category: test backdoor
- Location: `POST /api/test/arrange`
- Description: the route can arrange hands. It returns 403 unless `CARAMBA_TEST_MODE=1`. Playwright sets that only for itself.
- Status: accepted. Do not set `CARAMBA_TEST_MODE` on Vercel.

## What was already sound

- Play, draw, pickup, and Carramba ignore client scores and client deck order.
- Card ownership is checked before a discard.
- Version conflicts become HTTP 409 instead of a double apply.
- Room codes are random, not sequential.
- Host is taken from the room record, never from `isHost` in the body.
- Chat is rendered as React text. There is no `dangerouslySetInnerHTML`.
- Errors returned to the client do not include stack traces. Unexpected errors are logged on the server and replaced with a generic message.
- The shuffle uses `node:crypto` `randomInt`.
- A new 104-card deck is shuffled at the start of each round.

## Future readiness

| Feature | Score | Why |
|---|---|---|
| Anonymous to accounts | MOSTLY READY | The session verifies a player id. An account can later be stored beside that id. The engine never reads nicknames as identity. |
| Email verification | NEEDS ARCHITECTURAL WORK | No account table yet, on purpose. Use a provider later. Do not put password hashes in `games`. |
| Rankings | MOSTLY READY | Round and game results are server-calculated and versioned. A future rating writer can subscribe to `GAME_FINISHED` without trusting the browser. |
| Tournaments | MOSTLY READY | The engine only knows Carramba rules. A tournament layer can create rooms and read finished games. |
| Ads | MOSTLY READY | CSP `script-src` is `'self'` plus the Next inline exception. An ad host must be added explicitly. Ads must not receive cookies, hands, or the database secret. `connect-src` is currently `'self'`. |
| Analytics | READY | Game events already exist on the server. Analytics can copy those names later and must not feed back into the engine. |

## Limits in force

| Action | Limit |
|---|---|
| Create room | 8 per hour per IP |
| Join room | 30 per 10 minutes per IP |
| Chat | 12 per minute per player |
| Any game action | 90 per minute per player |
| JSON body | 16,000 characters |
| Nickname | 2–16 characters after control characters are removed |
| Chat message | 240 characters, last 80 kept |

## Tests

`tests/unit/security.test.ts` covers forged cookies, hidden hands, event stripping, the 104-card invariant, outsider round start, cross-site origin rejection, rate limits, nickname stripping, and a live anon-key denial against Supabase when `.env.local` is present.

## Commands

```text
npm test          passed, 5 files
npm run lint      passed
npm audit         dev-only findings, not force-fixed
npm run build     passed
```
