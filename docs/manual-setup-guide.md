# What Hugo has to do by hand

Code cannot create these accounts, sign these contracts, or type your tax identity. Do the steps in order. Leave every secret out of git. Put secrets in `.env.local` on your machine and in the Vercel project’s environment settings for production.

Vercel: open the project, then **Settings → Environment Variables**. Add each name for Production (and Preview only if you want to test there). Redeploy after saving, because `NEXT_PUBLIC_` values and the Content-Security-Policy are fixed at build time.

Local file: `/Users/tesla/Projects/caramba-online/.env.local`. Copy names from `.env.example`. Never commit `.env.local`.

## 1. Decide the legal entity

1. Read [Service-Public, create a business](https://www.service-public.fr/professionnels-entreprises/vosdroits/F32887) and [Guichet unique](https://procedures.inpi.fr/).
2. Decide whether Carramba is still a hobby or is a professional activity. Ads and subscriptions push it toward professional.
3. If you register, write down the legal name, address, SIREN, SIRET, legal form, and VAT status.
4. Put those words into `docs/mentions-legales-draft.md`, `docs/privacy-policy-draft.md`, and `docs/terms-of-service-draft.md`, then into the matching pages under `app/legal/`.
5. Have a lawyer read the three drafts, especially withdrawal, liability, and whether the Digital Services Act applies to chat.

There is no value to paste into the code from this step. The site shows the pages with brackets until you edit them.

## 2. Supabase: service role, so account deletion can block login

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) and select the Carramba project.
2. Go to **Project Settings → API Keys** (the page may still be labelled **API**).
3. Reveal the **service_role** secret. It bypasses row-level security. Treat it like a password.
4. Paste it as `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and in Vercel.
5. Confirm the project region is still **eu-west-3** under **Project Settings → General**.
6. Open **Legal** or the organization agreements and accept the [Supabase DPA](https://supabase.com/legal/dpa) if you have not.

Verify: sign in, open Profile, delete the account, and confirm the Auth user can no longer sign in. The public name should be “Deleted Player”. Do this with a test account, not your only login, until you are sure.

If you skip the service-role key, profile anonymization still runs, and the JSON response says the email was not cleared.

## 3. Friend ad-free access (SQL)

There is no button in the website for this. A button would let any player grant it.

1. Supabase dashboard → **SQL Editor → New query**.
2. Paste the following. Change the username. Usernames are lowercase.

```sql
update public.profiles
set entitlement = 'AD_FREE',
    entitlement_source = 'manual',
    entitlement_expires_at = null,
    updated_at = now()
where username = 'friend123';
```

3. Run it. You should see `UPDATE 1`. If you see `UPDATE 0`, the username does not exist. Ask them to sign up first.
4. To remove it later:

```sql
update public.profiles
set entitlement = 'FREE',
    entitlement_source = 'default',
    entitlement_expires_at = null,
    updated_at = now()
where username = 'friend123'
  and entitlement_source = 'manual';
```

Verify: that friend opens the site while signed in. The dashed ad box disappears. `GET /api/me` shows `showAds: false` and `entitlement: "AD_FREE"`.

A later Stripe cancellation will not wipe this row, because the code refuses to set `FREE` from Stripe when the source is `manual`.

## 4. Vercel host identity and DPA

1. Open [https://vercel.com/legal](https://vercel.com/legal).
2. Copy the current company name and mailing address into the mentions légales. Do not use an address from an old blog.
3. Accept the [Vercel DPA](https://vercel.com/legal/dpa) for the team that owns the project.
4. In the Vercel project, set the function region if you want execution in the EU, and set log retention to the shortest period you can live with.

No code value comes back from this step except the words you paste into the legal page.

## 5. Google AdSense

Do this only when the site is public, has real content (the game and the rules page), and the legal pages no longer contain empty brackets. Google rejects unfinished sites.

1. Open [https://www.google.com/adsense/start/](https://www.google.com/adsense/start/) and sign in with the Google account that should receive the money.
2. Add the site `carramba.online` (or `https://carramba.online`).
3. Google will show a verification method. Prefer the meta tag or the ads.txt method they display that day. If they give an ads.txt line, create `public/ads.txt` with exactly that line and deploy. If they give a meta tag, add it in `app/layout.tsx` metadata, then deploy.
4. Submit the site for review. Wait. You cannot invent a publisher id while you wait.
5. When approved, open **Account → Settings → Account information** and copy the publisher id. It looks like `ca-pub-` plus digits.
6. Put it in Vercel and `.env.local` as `NEXT_PUBLIC_ADSENSE_CLIENT_ID`.
7. In AdSense, go to **Ads → By ad unit → Display ads**, create one responsive display unit, and copy the numeric `data-ad-slot`. Put it in `NEXT_PUBLIC_ADSENSE_SLOT_ID`.
8. Open **Privacy & messaging** (the menu name Google currently uses for the EU message). Turn on the GDPR message for the EEA, the UK, and Switzerland. Google’s CMP id is 300. This is required for personalized ads. The banner inside Carramba is not a substitute. See [Google’s CMP article](https://support.google.com/adsense/answer/13554116).
9. Complete **Payments** in AdSense: identity, address, and bank account. Complete the tax form they show. A mismatch with your French tax status is an accountant question.
10. Redeploy Vercel so the new public variables are baked into the build. The Content-Security-Policy only allows Google’s ad hosts when the client id exists at build time.

Verify:

- Before you click Accept, the home page must not request `pagead2.googlesyndication.com` (check the browser network panel).
- Click Refuse. Still no request.
- Click Accept on a free account. The request may appear, and an ad may fill the slot. Premium and manual ad-free accounts still show nothing.
- Play a game. The table must not show an ad and the cookie dialog must not cover the cards.

If Google’s own CMP script is blocked by the Content-Security-Policy, add the host Google names in the error to the ad-host list in `next.config.ts` and redeploy. Do not paste an unknown script URL into an environment variable.

## 6. Stripe

1. Create an account at [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register).
2. Finish identity verification. Stripe will ask for a government id and, for a company, the company documents. Use the same legal name as the mentions légales.
3. Add the bank account under **Settings → Payouts** (wording can be **Business settings → Bank accounts and currencies**).
4. Complete **Settings → Tax information** (or the tax form in the activation checklist).
5. Read and accept the Stripe services agreement when the dashboard presents it. Also accept the [DPA](https://stripe.com/legal/dpa).
6. Decide VAT with an accountant. If you will use Stripe Tax, activate it under **Tax** and add your registrations. Only then set `STRIPE_AUTOMATIC_TAX=1`. If you set it earlier, Checkout returns an error.
7. Switch the dashboard to **Test mode** first.
8. Go to **Product catalogue → Add product**. Name: `Carramba Premium`. Description: `Removes advertisements.` Add a recurring price (monthly is the simple choice). Copy the price id (`price_...`).
9. Put these in `.env.local` and Vercel, **without** the `NEXT_PUBLIC_` prefix:
   - `STRIPE_SECRET_KEY` = the secret key from **Developers → API keys**. Use `sk_test_...` until you have tested, then the live `sk_live_...`.
   - `STRIPE_PRICE_ID` = the price id.
10. **Developers → Webhooks → Add endpoint.**
    - Endpoint URL: `https://carramba.online/api/billing/webhook`
    - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
    - Copy the signing secret `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
11. Local test, optional: install the Stripe CLI, run `stripe listen --forward-to localhost:3000/api/billing/webhook`, and put the CLI signing secret in `.env.local` while you listen.
12. Redeploy.
13. Sign in on the site, open **Plans**, click **Subscribe**. Pay with Stripe’s test card `4242 4242 4242 4242` only in test mode. You should return to `/premium?checkout=success`. The profile entitlement becomes `PREMIUM` and ads disappear.
14. Click **Manage or cancel subscription**. You should land in the Stripe customer portal. Cancel. After the webhook, a Stripe-sourced plan returns to `FREE`. A manual `AD_FREE` plan stays `AD_FREE`.
15. Repeat steps 8–10 in **live mode** with the live secret key, live price id, and live webhook secret when you are ready to charge real money. Do not mix test and live keys.

The browser never receives the secret key. There is no publishable key in this integration because Checkout is a redirect, not an embedded card form.

## 7. Production secrets that should already exist

Confirm these are set in Vercel and are not the example blanks:

- `NEXT_PUBLIC_SUPABASE_URL` (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public by design)
- `CARAMBA_DB_SECRET` (secret; must match `private.server_auth` in the database)
- `CARAMBA_SESSION_SECRET` (secret; if empty, the code falls back to the database secret)
- `CARAMBA_TEST_MODE` must be empty in production

## 8. How to tell it worked

| Check | Expected |
| --- | --- |
| Home page, no AdSense id | Dashed “Advertisement” box, no request to googlesyndication |
| Home page, AdSense id, no choice yet | No ad script |
| Refuse | No ad script, choice stored |
| Accept, free user, ids set | Ad script may load |
| Ad-free SQL grant | No ad box |
| Subscribe in Stripe test mode | Profile `PREMIUM`, source `stripe` |
| Cancel in the portal | `FREE`, unless source was `manual` |
| Profile → Download my data | A JSON file downloads |
| Profile → Delete account | Name becomes Deleted Player, you are signed out |
| Open a game | No cookie bar over the table, no advertisement on the table |
