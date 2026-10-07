import { LegalDraft } from "@/components/legal/legal-draft";

export default function PrivacyPage() {
  return (
    <LegalDraft title="Privacy policy">
      <p>Publisher: [LEGAL BUSINESS NAME], [BUSINESS ADDRESS], [CONTACT EMAIL], [SIREN/SIRET IF APPLICABLE]. Data protection contact: [DATA PROTECTION CONTACT].</p>
      <h2 className="font-display text-2xl text-cream">Who this describes</h2>
      <p>
        Carramba Online at carramba.online is a multiplayer card game. This draft covers the processing the
        application actually performs: accounts, anonymous table cookies, chat, rankings, and the advertising
        and subscription switches that stay off until you configure them.
      </p>
      <h2 className="font-display text-2xl text-cream">Data</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Account email and password hash, stored by Supabase Auth in the EU region eu-west-3. Carramba does not store the password itself.</li>
        <li>Username, display name, optional https avatar URL, games played, wins, and rating.</li>
        <li>An anonymous player id in the httpOnly cookie caramba_pid, and a nickname in caramba_name, so a private table can continue without an account.</li>
        <li>Chat lines stored inside the game record, with the nickname typed at the table.</li>
        <li>Match results for ranked and casual games: placement and rating change. Private games do not change rating.</li>
        <li>Advertising choice, version 2026-10-07, and the time of that choice, when you are signed in.</li>
        <li>Abuse reports: room code, a short excerpt, and your reason.</li>
        <li>If you subscribe later, a Stripe customer id. Card numbers stay with Stripe.</li>
      </ul>
      <h2 className="font-display text-2xl text-cream">Why</h2>
      <p>
        Accounts, games, chat, and rankings are processed to provide the service you asked for (GDPR Article 6(1)(b)).
        The anonymous cookie is strictly necessary for the table session. Advertising cookies run only after you
        accept them (consent, Article 6(1)(a), and Article 82 of the French Data Protection Act). Fraud limits and
        abuse reports are used to keep the service secure (Article 6(1)(f)). Invoices and tax records, once payments
        exist, follow legal obligations (Article 6(1)(c)). That legal-basis mapping should be confirmed for your
        actual business.
      </p>
      <h2 className="font-display text-2xl text-cream">Retention</h2>
      <p>
        The anonymous cookie lasts 30 days. Ranked results are kept so the leaderboard stays coherent. Chat stays
        inside the game record; there is no separate long-term chat archive. Consent choices are kept as evidence
        of the choice. Abuse reports are kept so a report can be reviewed. IP addresses are used only in short-lived
        server memory for rate limits and are not written to the database. Payment records, once Stripe is connected,
        follow Stripe and French accounting retention, which can be longer than the account.
      </p>
      <h2 className="font-display text-2xl text-cream">Sharing and transfers</h2>
      <p>
        Supabase hosts the database and authentication in eu-west-3. Vercel hosts the website; Vercel logs can be
        processed outside the EU, which is an international transfer you must cover with Vercel’s data processing
        addendum. Google receives data only if you set an AdSense publisher id and the player accepts advertising.
        Stripe receives billing data only if you set the Stripe keys and the player subscribes. There is no analytics
        product and no Meta pixel.
      </p>
      <h2 className="font-display text-2xl text-cream">Your choices</h2>
      <p>
        Signed-in players can export a JSON copy from the profile page, correct the display name there, change the
        advertising choice from Cookie choices, and delete the account. Deletion renames the public profile to
        “Deleted Player” and keeps match results so other players’ games stay intact. Clearing the login email
        requires the server service-role key. You can also complain to the CNIL.
      </p>
    </LegalDraft>
  );
}
