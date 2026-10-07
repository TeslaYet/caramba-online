# Compliance report

7 October 2026. Technical measures in this repository are not a certificate of legal compliance. Legal compliance depends on your business structure, the contracts you sign, your tax position, and the final text of the legal pages. Items marked for a professional should be reviewed by one.

The technical implementation addresses the requirements listed under GREEN and the code columns of the matrix in `docs/legal-compliance-audit.md`.

## GREEN

No significant issue found in the current code for these items.

| Issue | Why it matters | Status | Recommended fix | Code can do it | You must act | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Third-party ad script loading before a choice | CNIL requires prior consent | The AdSense script is not loaded. The publisher id is empty. The placeholder is first-party text | Keep the id empty until the CMP step in the setup guide is done | Done | Do not paste an id early | [CNIL](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/que-dit-la-loi) |
| Ads on the card table | Accidental clicks and a broken game | Slots are not rendered on `/room` or `/game`. The cookie bar is hidden there too | Leave it that way | Done | None | [AdSense placement](https://support.google.com/adsense/answer/1346295) |
| Client-side premium flag | A player could hide ads without paying | `showAds` comes from the database entitlement. The profile update route does not accept an entitlement | None | Done | Grant friends only with the SQL in the setup guide | GDPR Art. 32, and your own billing integrity |
| Card data on the server | PCI scope | Checkout is a redirect to Stripe. No card field exists | Keep it hosted | Done | Stripe account, when you charge | [Stripe Checkout](https://docs.stripe.com/payments/checkout) |
| Analytics or Meta pixels | Extra consent and disclosure | None in the repository | Do not add one without updating the privacy draft and the banner | Done | None | CNIL cookie rules |
| Passwords in application logs | Credential theft | The game server does not log passwords. Error logs strip `Bearer` tokens | Keep chat and cookies out of `console.error` | Done | Check Vercel log retention | GDPR Art. 32 |
| Necessary cookie blocked by a banner | Would break private tables | `caramba_pid` is set by the server and is not gated | None | Done | None | CNIL exemption for a service the user requested |

## YELLOW

Needs configuration or a decision. Safe to keep developing. Do not treat the public site as a finished commercial service.

| Issue | Why it matters | Status | Recommended fix | Code can do it | You must act | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Legal pages contain brackets | A notice with a fake or empty publisher does not satisfy the LCEN | Drafts are live at `/legal/privacy`, `/legal/terms`, `/legal/mentions`, `/legal/cookies`, `/legal/premium` | Fill them after registration and legal review | Drafts written | Yes | [Service-Public F31228](https://entreprendre.service-public.fr/vosdroits/F31228) |
| Processor contracts not accepted in this audit | GDPR Art. 28 | Supabase and Vercel are in use. Acceptance is in their dashboards, not in git | Accept both DPAs | Cannot | Yes | [Supabase DPA](https://supabase.com/legal/dpa), [Vercel DPA](https://vercel.com/legal/dpa) |
| Vercel region and log retention unknown | International transfer and storage limitation | Hosting is Vercel. The database region is eu-west-3 | Confirm region and shorten log retention | Cannot see your Vercel account | Yes | GDPR Arts. 5 and 44 |
| Account email remains if the service-role key is absent | Erasure is incomplete | Anonymization runs either way. Auth ban runs only with `SUPABASE_SERVICE_ROLE_KEY` | Add the key | Code is ready | Yes | GDPR Art. 17 |
| Historical chat nicknames | Erasure vs integrity of the game record | Not rewritten | State it in the final policy, which the draft already does. A lawyer can tell you if that is enough | Flagged | Decide | GDPR Art. 17 |
| No moderator queue | Reports are stored and not shown in a UI | `abuse_reports` is server-only | Read the table in the Supabase SQL editor when you have reports | A public admin UI was intentionally not built | Yes, manually | DSA Art. 16 may apply; see ORANGE |
| `script-src 'unsafe-inline'` | Weakens CSP | Left in place so the existing Next.js app keeps working | A nonce-based CSP is a later hardening task | Not in this pass | Later | [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) |
| Sound and motion localStorage | Similar technology, low risk | Written only after the player changes the setting | Described in the cookie page | Done | None unless a lawyer disagrees | CNIL, strictly necessary vs preferences |

## ORANGE

Important. Do not turn the related feature on for the public until the human step is done.

| Issue | Why it matters | Status | Recommended fix | Code can do it | You must act | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Personalized AdSense in the EEA without a certified CMP | Google can limit or withhold serving. CNIL still requires consent for non-essential trackers | Custom banner gates the script. It is not TCF CMP ID 300 | Enable Google Privacy & messaging before setting `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Cannot create the AdSense account | Yes | [Google](https://support.google.com/adsense/answer/13554116) |
| Mentions légales incomplete | Required for a professional site | Placeholders only | Register if required, then fill the page | Cannot invent SIRET or address | Yes | [F31228](https://entreprendre.service-public.fr/vosdroits/F31228) |
| Withdrawal and VAT for Premium | Consumer and tax duties start when you charge | Checkout returns 503 until Stripe env vars exist. No withdrawal waiver was added | Lawyer plus accountant, then Stripe Tax and `STRIPE_AUTOMATIC_TAX=1` if that is your setup | Scaffold only | Yes | [L221-18](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032227300), [Stripe Tax](https://docs.stripe.com/tax) |
| Digital Services Act and chat | A hosting service needs a notice channel. Some platform duties depend on size and on whether content is disseminated to the public | A report button exists. It does not collect the statutory good-faith statement | Ask a lawyer if Art. 16 applies. If it does, extend the form | Partial | Yes | [DSA](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2065) |
| Children, ads, and chat | Art. 8 and possible ad restrictions | No age gate, on purpose | Decide a minimum age in the terms if advice says so | Not invented | Yes | [CNIL minors](https://www.cnil.fr/fr/la-protection-des-donnees-des-mineurs) |

## RED

Do not launch **that feature** until the item is fixed. The free card game itself is not in this list.

| Issue | Why it matters | Status | Recommended fix | Code can do it | You must act | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Taking advertisement money or subscription money before the publisher is identified and the tax position is known | LCEN identity, consumer information, and tax | Payments and AdSense are switched off until you add keys | Finish sections 1, 5, and 6 of `docs/manual-setup-guide.md` | Cannot | Yes | [F31228](https://entreprendre.service-public.fr/vosdroits/F31228), [F32887](https://www.service-public.fr/professionnels-entreprises/vosdroits/F32887) |
| Setting an AdSense client id in production without Google’s CMP | EEA ad serving and consent | Code will load Google’s script after Accept | Do the CMP step first | The gate exists. The CMP account does not | Yes | [Google CMP](https://support.google.com/adsense/answer/13554116) |

## Controlled launch

A controlled launch of the **free game** (private tables, accounts, ranked play, bots), with the dashed placeholder boxes and without Stripe keys or an AdSense id, is technically possible from this codebase. It is not a statement that the published legal pages are finished. Replace the brackets, or keep the pages clearly marked as drafts, before you present the site as a business.

Do not launch paid Premium or live AdSense until the RED rows are done.
