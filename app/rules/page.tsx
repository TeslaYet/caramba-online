import Link from "next/link";
import { RULE_ASSUMPTIONS } from "@/lib/game/rules";

export default function RulesPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
      <p className="text-sm uppercase tracking-[0.3em] text-gold">How to play</p>
      <h1 className="font-display text-6xl">Carramba</h1>
      <div className="prose-caramba mt-8 space-y-8 text-cream/85">
        <section>
          <h2 className="font-display text-3xl text-cream">Objective</h2>
          <p>
            Keep your hand value as low as possible and avoid reaching more than
            100 cumulative points.
          </p>
        </section>
        <section>
          <h2 className="font-display text-3xl text-cream">Cards</h2>
          <p>104 cards: 2 standard decks, no Jokers.</p>
        </section>
        <section>
          <h2 className="font-display text-3xl text-cream">Card values</h2>
          <p>A = 1 · 2–9 = face value · 10/J/Q/K = 10</p>
        </section>
        <section>
          <h2 className="font-display text-3xl text-cream">Valid combinations</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Single card</li>
            <li>2–5 cards of the same rank</li>
            <li>3–5 consecutive cards of the same color</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-3xl text-cream">Full-hand discard</h2>
          <p>
            You may discard your entire hand if it is a legal combination, then
            draw one card.
          </p>
          <pre className="mt-3 rounded-2xl bg-black/30 p-4 text-sm">
{`9 10 J Q K
↓
discard all 5
↓
draw 1
↓
1 card remaining`}
          </pre>
        </section>
        <section>
          <h2 className="font-display text-3xl text-cream">Carramba</h2>
          <p>
            You can call Carramba only when your hand totals 7 or less. Strictly
            lowest hand = 0 points. Tie or higher hand = hand value + 30.
          </p>
        </section>
        <section>
          <h2 className="font-display text-3xl text-cream">Cumulative score</h2>
          <p>Exactly 100 becomes 50. Above 100 eliminates the player.</p>
        </section>
        <section>
          <h2 className="font-display text-3xl text-cream">House assumptions</h2>
          <ol className="list-decimal space-y-1 pl-5">
            {RULE_ASSUMPTIONS.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </section>
      </div>
      <Link href="/" className="mt-10 inline-block text-gold">
        Back home
      </Link>
    </main>
  );
}
