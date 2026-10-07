# Personal action checklist

Only steps that remain after the code in this repository. Details are in `docs/manual-setup-guide.md`.

## Legal identity

- [ ] Decide whether Carramba is a hobby or a professional activity
- [ ] If it is professional, register on the Guichet unique and keep the SIREN / SIRET
- [ ] Choose the VAT position with an accountant
- [ ] Fill `[LEGAL BUSINESS NAME]`, address, email, phone, SIREN, VAT line, and director of publication in the drafts
- [ ] Copy Vercel’s current legal name and address into the mentions légales
- [ ] Have a lawyer review privacy, terms, withdrawal, and whether the DSA applies to chat
- [ ] Publish the reviewed text on `/legal/privacy`, `/legal/terms`, `/legal/mentions`, `/legal/cookies`, and `/legal/premium`

## Processors

- [ ] Accept the Supabase data processing addendum
- [ ] Confirm the Supabase region is still eu-west-3
- [ ] Accept the Vercel data processing addendum
- [ ] Set Vercel log retention and, if you want it, an EU function region
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and in Vercel
- [ ] Confirm `CARAMBA_TEST_MODE` is empty in production

## Advertising (do not start until the legal pages are filled)

- [ ] Create a Google AdSense account
- [ ] Add `carramba.online` and complete the verification method Google shows
- [ ] Wait for site approval
- [ ] Enter payments, identity, and the tax form in AdSense
- [ ] Turn on Privacy & messaging for the EEA, UK, and Switzerland
- [ ] Copy the publisher id into `NEXT_PUBLIC_ADSENSE_CLIENT_ID`
- [ ] Create one display ad unit and copy the slot id into `NEXT_PUBLIC_ADSENSE_SLOT_ID`
- [ ] Redeploy
- [ ] Test refuse: no request to `pagead2.googlesyndication.com`
- [ ] Test accept on a free account
- [ ] Test that a game table still has no ad and no cookie bar

## Friends without ads

- [ ] Run the `AD_FREE` / `manual` SQL from the setup guide for each friend
- [ ] Confirm their `/api/me` response has `showAds: false`

## Premium payments (test mode first)

- [ ] Create a Stripe account and finish identity verification
- [ ] Add the bank account and tax details
- [ ] Accept Stripe’s services agreement and DPA
- [ ] Create the Premium product and a recurring price
- [ ] Copy the price id into `STRIPE_PRICE_ID`
- [ ] Copy the secret key into `STRIPE_SECRET_KEY`
- [ ] Add the webhook endpoint `https://carramba.online/api/billing/webhook`
- [ ] Subscribe to `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`
- [ ] Copy the signing secret into `STRIPE_WEBHOOK_SECRET`
- [ ] Activate Stripe Tax only if your accountant told you to, then set `STRIPE_AUTOMATIC_TAX=1`
- [ ] Redeploy
- [ ] Test checkout with Stripe’s test card
- [ ] Confirm the account becomes `PREMIUM` and ads disappear
- [ ] Test cancel in the customer portal
- [ ] Confirm a manual ad-free friend is not downgraded
- [ ] Repeat with live keys only when the legal and tax steps above are done

## Data rights

- [ ] Test “Download my data” on a signed-in profile
- [ ] Test “Delete account” on a disposable account
- [ ] Confirm the Auth user is blocked when the service-role key is set
- [ ] Read `abuse_reports` in the Supabase SQL editor after a test report
