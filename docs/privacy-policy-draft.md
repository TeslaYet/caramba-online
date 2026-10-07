# Privacy policy — draft

**Status: draft. Do not publish this file as a finished policy until every bracket is replaced and a qualified person has reviewed it.**

This draft describes the Carramba Online application as implemented in this repository on 7 October 2026. It does not invent a company.

Last updated: 7 October 2026.

## Who is responsible

Controller: **[LEGAL BUSINESS NAME]**
Address: **[BUSINESS ADDRESS]**
Email: **[CONTACT EMAIL]**
Phone: **[PHONE NUMBER]**
SIREN / SIRET: **[SIREN/SIRET IF APPLICABLE]**
Data protection contact: **[DATA PROTECTION CONTACT]** (use the same email if you have no separate contact)

If you have no registered business yet, do not invent one. Say who the real person responsible is only after you have decided that, with advice if you need it.

## What Carramba is

Carramba is a multiplayer card game at https://carramba.online. You can play a private table without an account. An account is required for random matchmaking, ranked games, friends, and a rating.

## Personal data the application processes

### Account

- Email address and an authentication identifier, stored by Supabase Auth.
- The password is handled by Supabase Auth. Carramba application code does not store the password or the password hash in its own tables.
- Username (2–16 characters, lowercase letters, digits, underscore).
- Display name.
- Optional avatar URL, only if it is an `https` URL you submit.
- Games played, wins, and a rating that starts at 1200. The rating changes in ranked games only.

### Table without an account

- A random player id in the cookie `caramba_pid`. The cookie is httpOnly, SameSite=Lax, Secure in production, and lasts 30 days.
- The nickname you type, in the cookie `caramba_name`.

### Game and chat

- Moves and scores, stored as part of the game.
- Chat messages up to 240 characters, stored inside the game record with the nickname that was used at the table and the time.
- Match results for casual and ranked games: game id, placement, rating before and after.

### Advertising choice

- If you are signed in and you use the cookie banner, the server stores whether you accepted advertising, the policy version `2026-10-07`, and the time. It does not store your IP address in that table.
- On the device, the same choice is kept in `localStorage` under `caramba-consent`.

### Reports

- If you report a chat line: room code, message id, a short excerpt, your reason, and your account id if you are signed in.

### Payments, only after Stripe is configured

- Carramba stores a Stripe customer id and the plan (`FREE`, `AD_FREE`, or `PREMIUM`), the source (`default`, `manual`, or `stripe`), and an expiry time.
- The card number is entered on Stripe’s site, not on Carramba.

### Data the application does not collect today

- No analytics product.
- No Meta pixel.
- No advertising identifier, until an AdSense publisher id is configured and you have accepted advertising.
- No newsletter.
- No precise location. The hosting provider can see the IP address of a request in its logs.

## Why and on what basis

These bases are the ones that fit the current code. They should be confirmed for your real activity.

| Processing | Why | Draft basis |
| --- | --- | --- |
| Account, private table, matchmaking, chat, friends | Provide the game you asked for | GDPR Art. 6(1)(b) |
| `caramba_pid` cookie | Keep the same seat | Strictly necessary. Art. 82 of the French Data Protection Act exempts this kind of storage from prior consent |
| Rating and leaderboard | Run ranked play | Art. 6(1)(b) |
| Advertising cookies, when enabled | Fund the free game with ads | Consent, Art. 6(1)(a), and prior consent under the cookie rules |
| Rate limits and abuse reports | Limit spam and follow up on reports | Art. 6(1)(f). The interest is keeping the table usable. This basis is the one most often debated; confirm it |
| Invoices and tax, later | Legal bookkeeping | Art. 6(1)(c), once a tax duty exists |

## How long it is kept

- `caramba_pid` and `caramba_name`: 30 days.
- Account profile: until you delete the account, then the public name becomes “Deleted Player” and the username becomes `deleted_` plus part of the id.
- Match results: kept after deletion so other players’ results and the leaderboard are not destroyed.
- Chat: kept inside the game record. Deleting an account does not rewrite old nicknames inside old games, because those strings were copied when the person joined.
- Consent rows: removed when the account is deleted. A new choice adds a new row.
- Abuse reports: kept until **[CONTACT EMAIL]** no longer needs them to handle the report. There is no automatic deletion job yet.
- IP addresses used for rate limits: only in server memory for the limit window (minutes).
- Vercel request logs: whatever retention you set in the Vercel project. **[HUGO: SET THIS]**
- Stripe records: Stripe’s retention plus any French accounting retention that applies to you. Accounting documents are often kept for several years. Confirm the period with an accountant. Do not delete an invoice early to satisfy an erasure request if the law tells you to keep it.

## Who receives it

- Supabase (database and authentication), project region eu-west-3.
- Vercel (hosting and request logs).
- Other players at your table see your nickname and chat. Other players can see a public username, display name, and rating.
- Google, only if AdSense is configured and you accepted advertising.
- Stripe, only if you subscribe after billing is configured.
- **[ANYONE ELSE YOU ADD LATER]**

Carramba does not sell personal data.

## Transfers outside the EU

The Supabase project used for this application is in eu-west-3 (Paris). Supabase and Vercel are companies that can use subprocessors outside the EU. Their data-processing terms and, where they use them, the European Commission’s standard contractual clauses are the mechanism. You have to accept those terms in each provider’s dashboard. Google and Stripe, if you enable them, are separate transfers. See [the Commission’s SCC page](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en).

## Your rights

You can ask for access, correction, erasure, restriction, and objection, and you can complain to the CNIL ([www.cnil.fr](https://www.cnil.fr/)).

In the product today:

- Download a JSON export from the profile page (`GET /api/account/export`). It includes the profile, match results, friendships, and consent rows. It does not include every historical chat line.
- Change the display name on the profile page.
- Change or refuse advertising from “Cookie choices” on any page except the table.
- Delete the account from the profile page. You must type DELETE. The public profile becomes “Deleted Player”.

Where a request cannot be completed in the product (for example an old chat line that still shows a nickname), write to **[CONTACT EMAIL]**.

## Children

The service is not designed as a service directed at children. The legal age at which a child in France can consent alone to an information-society service is 15. If you know you are building for under-15s, stop and get advice before turning on ads or payments. See [CNIL, minors](https://www.cnil.fr/fr/la-protection-des-donnees-des-mineurs).

## Security

Passwords are not stored by the game server. Session cookies used for the table are httpOnly. Entitlements cannot be edited from the browser. Payment card data is not sent to Carramba’s server.

## Changes

Replace the date when the processing changes. If the change needs new consent (for example a new advertising partner), ask again. The consent record version in code is `2026-10-07`.
