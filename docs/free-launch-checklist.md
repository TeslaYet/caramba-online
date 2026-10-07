# Free launch checklist

7 October 2026. Free Carramba can be launched while advertising and payments stay off. This is not a statement that the legal pages are finished.

## Git

- [IMPLEMENTED] Checkpoint commit of the free game, accounts, and inactive billing scaffolding.
- [IMPLEMENTED] Launch fixes are a separate commit after that checkpoint.
- [MANUAL] Push or deploy only when you want the public site updated. Local git is not the live site until that happens.

## Build and tests

- [IMPLEMENTED] `npm run lint`
- [IMPLEMENTED] `npm run test` (unit)
- [IMPLEMENTED] `npm run build`
- [IMPLEMENTED] Browser tests for a two-player match, 4-player and 8-player tables, phone layout, consent, and legal pages. They run against an in-memory server, not the live database.
- [MANUAL] `npm run test:e2e` needs a production build first, because this machine already has `next dev` on port 3000 and Next.js will not start a second dev server.

## Environment variables

- [IMPLEMENTED] `.env.example` labels public and secret names. No real keys are in git.
- [IMPLEMENTED] Missing AdSense and Stripe values fail safe: no ad script, checkout and webhook refuse to charge.
- [MANUAL] In Vercel → the Carramba project → Settings → Environment Variables, confirm Production does **not** contain `CARAMBA_TEST_MODE`, `CARAMBA_COOKIE_SECURE`, `NEXT_PUBLIC_ADSENSE_CLIENT_ID`, `NEXT_PUBLIC_ADSENSE_SLOT_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, or `STRIPE_PRICE_ID`.
- [MANUAL] Production should already have `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CARAMBA_DB_SECRET`, and `CARAMBA_SESSION_SECRET`.

## Supabase

- [IMPLEMENTED] Migrations `003`, `004`, and `005` are applied on project `gwnbbgowsszmbgmzrryy`. `005` makes `(room_id, seat_index)` unique.
- [IMPLEMENTED] Row-level security remains on game, consent, report, and billing tables. Players cannot read reports.
- [MANUAL] Accept the Supabase data-processing addendum in the dashboard if you have not.
- [OPTIONAL] Add `SUPABASE_SERVICE_ROLE_KEY` later so account deletion can also block the Auth email.

## Auth and realtime

- [IMPLEMENTED] Anonymous play uses an httpOnly HMAC cookie. In production the cookie is `Secure`.
- [IMPLEMENTED] Room updates are pushed over the existing room event stream.
- [IMPLEMENTED] A rejected turn (409) reloads the table instead of leaving the browser on a stale hand.

## Gameplay

- [IMPLEMENTED] Rules were not changed. Calling Carramba still requires a hand of 7 or less. That is the documented rule.
- [IMPLEMENTED] A legal 5-card hand can be discarded in one turn.
- [IMPLEMENTED] 2, 4, 6, and 8 player deals were checked for 104 unique cards and hidden opponent hands.
- [IMPLEMENTED] Browser check: 2 players through Carramba and the next round; 4 and 8 players seated with distinct seats.

## Mobile and desktop

- [IMPLEMENTED] Home checked at 1440×900, 1280×800, 768, 820, 390, 375, 430, and a short landscape phone. The main Play button stays above the cookie dialog.
- [IMPLEMENTED] A 390×844 touch table shows five cards, no cookie dialog, no advertisement, and no legal footer.
- [OPTIONAL] A full ranked match on a physical phone, after you deploy.

## Security

- [IMPLEMENTED] Server decides moves, scores, and winners.
- [IMPLEMENTED] Entitlements cannot be edited from the profile form.
- [IMPLEMENTED] Stripe secrets are server-only. There is no Stripe publishable key in the client.
- [IMPLEMENTED] `/api/test/arrange` returns 403 unless `CARAMBA_TEST_MODE=1`.
- [IMPLEMENTED] Security headers, including a Content-Security-Policy that allows Supabase and does not allow Google ad hosts until a publisher id exists at build time.

## Consent, ads, and payments

- [IMPLEMENTED] Refuse and Accept are the same height. Refusal stores the choice and loads no Google script.
- [IMPLEMENTED] Ads are not mounted on `/room` or `/game`.
- [BLOCKED] Live AdSense. Do not paste a publisher id until Google has approved the site and Privacy & messaging is on.
- [BLOCKED] Live Stripe charges. Do not paste live keys until identity, bank, tax, and the legal pages are done.

## Legal pages

- [IMPLEMENTED] Privacy, terms, legal notice, cookies, and premium terms are linked in the footer.
- [IMPLEMENTED] Brackets are still empty. No company identity was invented.
- [MANUAL] Replace the brackets only after you have the real details, then have them reviewed.

## Chat and accounts

- [IMPLEMENTED] Chat is plain text, max 240 characters, 12 messages a minute, with Report.
- [IMPLEMENTED] Profile export downloads JSON. Delete asks for the word DELETE and renames the player to Deleted Player.
- [MANUAL] Service-role key if the login email must be blocked too.
- [MANUAL] Read `abuse_reports` in the Supabase SQL editor when a report arrives. There is no moderator page.

## Logging, backups, smoke, rollback

- [IMPLEMENTED] Server error logs strip `Bearer` tokens. Chat and card numbers are not written there.
- [MANUAL] In Vercel, set the log retention you want. Vercel logs can include IP addresses.
- [MANUAL] Supabase → Database → Backups. Confirm the plan you are on actually keeps backups. The free plan's backup story is whatever Supabase shows you that day.
- [MANUAL] After deploy, open https://carramba.online and check the home page, rules, a private room, rankings, premium (must not charge), and one legal page.
- [MANUAL] Rollback: in Vercel → Deployments, open the previous deployment and choose Promote to Production. Do not drop database tables. Migration 005 only adds an index.

## Stop line

Advertising is off. Payments are off. The free game is the thing this checklist releases.
