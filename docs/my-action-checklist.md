# What you still have to do

Carramba's free game can run without these steps. Advertising and paid Premium must stay off until you finish the matching section. Nothing below was done inside your Google, Stripe, or business accounts.

Where a value is **secret**, put it only in Vercel → your project → **Settings → Environment Variables**, and in `.env.local` on your computer. Do not put it in git. Where it is **public**, it is still an environment variable, but the browser is allowed to see it.

## A. You must decide

These have no dashboard.

- [ ] Hobby or professional activity. If you earn money from ads or subscriptions, treat it as professional and use section B. A lawyer can confirm the line. Nothing to paste into the code.
- [ ] Whether the terms should name a minimum age. The game does not ask for a date of birth. Write the decision into `docs/terms-of-service-draft.md` only after advice.
- [ ] What you will do when a chat report arrives. The row is stored. You read it yourself (section E).

## B. You must register or create

Do these only when you decide to monetize or to publish a finished legal notice.

- [ ] Business registration, if section A says you need one. Open [https://procedures.inpi.fr/](https://procedures.inpi.fr/) (Guichet unique). Create the activity. Write down the legal name, address, SIREN, and SIRET. Those words go into the legal pages, not into an API key.
- [ ] Google account for ads, later. Open [https://www.google.com/adsense/start/](https://www.google.com/adsense/start/). Sign up. Add the site `https://carramba.online`. Do not invent a publisher id while Google reviews the site.
- [ ] Stripe account, later. Open [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register). Finish the identity screens Stripe shows. Stay in **Test mode** until a payment test works.

## C. You must enter personal or business information

- [ ] Legal pages. Edit `docs/mentions-legales-draft.md`, `docs/privacy-policy-draft.md`, and `docs/terms-of-service-draft.md`. Replace every `[BRACKET]`. Then copy the same words into `app/legal/mentions/page.tsx`, `app/legal/privacy/page.tsx`, and `app/legal/terms/page.tsx`. There is no env var for your name.
- [ ] Host address. Open [https://vercel.com/legal](https://vercel.com/legal). Copy the company name and address they publish today into the mentions légales. Do not use an address from memory.
- [ ] AdSense payments, after approval. In AdSense open **Payments**. Enter the payee name, address, and bank account they ask for. Nothing from that screen is pasted into Carramba except the publisher id in section E.
- [ ] Stripe bank and tax, before live charges. In the Stripe dashboard open **Settings**. Complete **Business** and the tax form. An accountant should match this to your French situation.

## D. You must accept provider agreements

- [ ] Supabase. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) → the Carramba project. Accept the data processing terms if the dashboard still shows them. The contract is [https://supabase.com/legal/dpa](https://supabase.com/legal/dpa). No value comes back.
- [ ] Vercel. Open the team that owns the project → the legal or agreement prompt, and [https://vercel.com/legal/dpa](https://vercel.com/legal/dpa). No value comes back.
- [ ] Google AdSense program policies and EU consent message, only after the account exists. In AdSense open **Privacy & messaging** and turn on the message for the EEA, UK, and Switzerland. Google's own tool is the certified consent tool. The banner in Carramba is not a substitute.
- [ ] Stripe services agreement and DPA, when the Stripe dashboard asks. The DPA is [https://stripe.com/legal/dpa](https://stripe.com/legal/dpa).

## E. You must configure dashboards

### Confirm the free launch is not secretly monetized

- [ ] Vercel → project → **Settings → Environment Variables**. Check Production. These names must be **absent** or empty: `CARAMBA_TEST_MODE`, `CARAMBA_COOKIE_SECURE`, `NEXT_PUBLIC_ADSENSE_CLIENT_ID`, `NEXT_PUBLIC_ADSENSE_SLOT_ID`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_AUTOMATIC_TAX`.
- [ ] Redeploy after any env change. Public variables and the security policy are fixed when the site is built.

### Friend ad-free access

- [ ] The friend signs up on the site first.
- [ ] Supabase → **SQL Editor → New query**. Paste this and change the username:

```sql
update public.profiles
set entitlement = 'AD_FREE',
    entitlement_source = 'manual',
    entitlement_expires_at = null,
    updated_at = now()
where username = 'friend123';
```

- [ ] Run it. You want `UPDATE 1`. There is no button on the website for this, on purpose.
- [ ] Ask them to refresh while signed in. The advertisement box should disappear.

### Account deletion that also blocks login

- [ ] Supabase → **Project Settings → API Keys**. Reveal **service_role**. It is a **secret**.
- [ ] Name: `SUPABASE_SERVICE_ROLE_KEY`. Place: Vercel Production and `.env.local`.
- [ ] Redeploy. Test with a disposable account, not your only login.

### AdSense, only after approval and the consent tool

- [ ] AdSense → **Account → Settings → Account information**. Copy the publisher id (`ca-pub-` and digits). **Public.** Name: `NEXT_PUBLIC_ADSENSE_CLIENT_ID`. Place: Vercel.
- [ ] AdSense → **Ads → By ad unit → Display ads**. Create one responsive unit. Copy the numeric slot id. **Public.** Name: `NEXT_PUBLIC_ADSENSE_SLOT_ID`. Place: Vercel.
- [ ] Redeploy. On the home page, before you click Accept, the browser must not call `pagead2.googlesyndication.com`.

### Stripe test mode, only when you are ready to test a payment

- [ ] Stripe dashboard, switch **Test mode** on.
- [ ] **Product catalogue → Add product**. Name `Carramba Premium`. Add a recurring price. Copy `price_...`. **Secret.** Name: `STRIPE_PRICE_ID`.
- [ ] **Developers → API keys**. Copy the secret key `sk_test_...`. **Secret.** Name: `STRIPE_SECRET_KEY`. Do not create a publishable key for this project. Checkout is a redirect.
- [ ] **Developers → Webhooks → Add endpoint**. URL `https://carramba.online/api/billing/webhook`. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy `whsec_...`. **Secret.** Name: `STRIPE_WEBHOOK_SECRET`.
- [ ] Leave `STRIPE_AUTOMATIC_TAX` unset until Stripe Tax is switched on and your accountant agrees.
- [ ] Redeploy. Sign in, open **Plans**, use card `4242 4242 4242 4242` in test mode only.
- [ ] Repeat with live keys only after sections A–D for payments are done. Do not mix test and live keys.

### Reports

- [ ] Supabase → **SQL Editor**. `select created_at, room_code, reason from public.abuse_reports order by created_at desc limit 20;` There is no public admin page.

## F. You should get professional advice

- [ ] A lawyer for the privacy policy, terms, mentions légales, withdrawal, and chat duties.
- [ ] An accountant for VAT before the first real subscription or ad payout.
- [ ] Do not paste their conclusions into the code until you have them.

## G. Already done in the project

- [x] Free game, private rooms, accounts, rankings, bots, and the 7-point Carramba rule left as documented.
- [x] Consent banner, legal draft pages, and footer links.
- [x] Ad slots that do not load Google while the publisher id is empty, and that are not on the table.
- [x] Stripe routes that do nothing until secrets exist. Premium cannot be switched on from the browser.
- [x] Export, anonymized deletion, and chat reports.
- [x] Database columns for entitlements, consent, reports, and Stripe event ids.
- [x] Unique seat index, and a game save that loses a race instead of corrupting the hand.
- [x] Lint, unit tests, production build, and browser checks on an isolated server.

The longer click path for Ads and Stripe is also in `docs/manual-setup-guide.md`.
