import { LegalDraft } from "@/components/legal/legal-draft";

export default function TermsPage() {
  return (
    <LegalDraft title="Terms of use">
      <p>Publisher: [LEGAL BUSINESS NAME], [BUSINESS ADDRESS], [CONTACT EMAIL]. These terms need a lawyer’s review before you treat them as final.</p>
      <h2 className="font-display text-2xl text-cream">The game</h2>
      <p>
        Carramba is a card game you can play at a private table without an account, or with an account for random
        games, ranked games, friends, and a rating. The server decides legal moves. A rating changes only in ranked
        games.
      </p>
      <h2 className="font-display text-2xl text-cream">Conduct</h2>
      <p>
        Do not cheat, use another person’s account, manipulate rankings, harass players, or send illegal content in
        chat. A report button stores a short excerpt for review. There is no promise of constant moderation or of
        uninterrupted availability.
      </p>
      <h2 className="font-display text-2xl text-cream">Accounts</h2>
      <p>
        You can delete an account from the profile page. The public name becomes “Deleted Player”. Historical match
        rows stay so the game record remains coherent. Suspension of an abusive account is a manual database action
        today; there is no public ban console.
      </p>
      <h2 className="font-display text-2xl text-cream">Premium</h2>
      <p>
        Premium is an optional subscription that removes ads. It is unavailable until [LEGAL BUSINESS NAME] connects
        Stripe. Price, renewal, and VAT are shown by Stripe Checkout before payment. Cancellation is in the Stripe
        customer portal, linked from the Plans page. A manual ad-free grant is not removed by a Stripe cancellation.
        French withdrawal rules for digital services may apply; this draft does not ask you to waive them.
      </p>
      <h2 className="font-display text-2xl text-cream">Liability</h2>
      <p>
        Mandatory French and EU consumer rights are not excluded. A clause that tried to waive those rights would
        not be reliable. The publisher is not liable for a player’s losses in a casual game beyond what the law requires.
      </p>
    </LegalDraft>
  );
}
