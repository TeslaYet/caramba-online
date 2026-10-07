import { LegalDraft } from "@/components/legal/legal-draft";

export default function PremiumTermsPage() {
  return (
    <LegalDraft title="Premium terms">
      <p>
        Premium removes advertisements. It does not change the card rules, the rating formula, or matchmaking.
        The subscription is off until Stripe keys and a price id are configured by [LEGAL BUSINESS NAME].
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Checkout is hosted by Stripe. Carramba does not receive the card number.</li>
        <li>The price, tax, and renewal date are shown on the Stripe page before you pay.</li>
        <li>The server marks the account PREMIUM only after a signed Stripe webhook. The browser cannot grant it.</li>
        <li>Cancel or update the card from Plans, which opens the Stripe customer portal.</li>
        <li>When a Stripe subscription ends, the account returns to Free unless a manual ad-free grant is on the account.</li>
        <li>Withdrawal rights for consumers in France and the EU may apply to a digital subscription. This page does not contain a waiver. Confirm the wording with a lawyer and make sure Stripe’s invoice and refund process matches it.</li>
      </ul>
    </LegalDraft>
  );
}
