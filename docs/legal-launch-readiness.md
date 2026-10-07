# Legal and launch readiness

7 October 2026. This is a technical status note. It is not a legal opinion, and it does not say that Carramba is compliant.

## Carramba call rule, left unchanged

The engine and the rules page both require a hand total of **7 or less** before a player can call Carramba. That limit is `GAME_RULES.CARAMBA_MAX_HAND`. The 5 October security note records it as an intentional rule. This launch pass did not change it.

A player may still discard an entire legal hand. A 5-card sequence or 5-card same-rank group is legal. That path is covered by unit tests and by the two-player browser test.

## 1. Technically complete for a free launch

- Private rooms without an account.
- Server-authoritative moves, scores, decks, and winners.
- Opponent hands are not sent while a round is in progress.
- A game write includes the expected version, so two servers cannot both save the same turn.
- Starting a room updates the lobby only if it is still a lobby.
- Seats reuse the first free chair, and the database rejects two players in the same chair.
- Accounts, rankings, friends, and practice bots exist. Ranked rating changes only in ranked games.
- Consent banner with equal Refuse and Accept. No Google script loads while the publisher id is empty.
- Legal draft pages are linked from the footer and hidden on the table.
- Export and anonymized deletion exist. Deletion does not erase other players' match rows.
- Chat is text, length-capped, rate-limited, and reportable. Reports are not readable by players.
- Stripe routes exist and refuse to run until the server secrets are set. The browser cannot grant Premium.
- Production build succeeds with AdSense and Stripe variables empty.

## 2. Drafted, not finished as legal documents

These pages and files still contain brackets such as `[LEGAL BUSINESS NAME]`:

- `/legal/privacy` and `docs/privacy-policy-draft.md`
- `/legal/terms` and `docs/terms-of-service-draft.md`
- `/legal/mentions` and `docs/mentions-legales-draft.md`
- `/legal/cookies`
- `/legal/premium`

They describe the current code. They are marked as drafts on the site.

## 3. Decisions only you can make

- Whether Carramba is still a hobby or is now a professional activity. That choice changes whether the mentions légales duty and business registration apply. This note does not decide it.
- The minimum age, if any, you want in the terms. No age gate was added.
- What you will do with a chat report, and how fast. There is no moderator screen.
- Whether a deleted player's old chat nickname may remain inside old games. The code leaves it there so the match is not rewritten.
- The refund rule for a future subscription. The draft does not waive the 14-day withdrawal right.

## 4. External configuration still required

Nothing in this list was done in your Google, Stripe, or Vercel account from this task.

- Supabase and Vercel data-processing terms, accepted by you in those dashboards.
- `SUPABASE_SERVICE_ROLE_KEY` if you want account deletion to block the login email.
- AdSense account, site review, payments, tax form, and Google's Privacy & messaging tool, before any publisher id is pasted.
- Stripe identity, bank, tax, product, price, and webhook, before any secret is pasted.
- The words for the legal pages, including Vercel's current legal name and address copied from [vercel.com/legal](https://vercel.com/legal).

Exact clicks are in `docs/my-action-checklist.md` and `docs/manual-setup-guide.md`.

## 5. Professional review

Have a lawyer read the three drafts before you treat them as final, especially liability, withdrawal, and whether the Digital Services Act applies to table chat. Have an accountant tell you the VAT position before you charge anyone. Those questions are not answered here.

## 6. Keep these off until the steps above are done

- `NEXT_PUBLIC_ADSENSE_CLIENT_ID`
- `NEXT_PUBLIC_ADSENSE_SLOT_ID`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_AUTOMATIC_TAX`
- `CARAMBA_TEST_MODE` (must stay empty in production)
- `CARAMBA_COOKIE_SECURE` (must stay unset in production; tests set it to 0 only for local http)

With those empty, the free game runs, the ad boxes are Carramba's own labels, checkout says you must sign in and then that billing is not configured, and the webhook answers that it is not configured. No advertising script is loaded and no money can move.
