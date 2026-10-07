import Link from "next/link";
import { AdSlot } from "@/components/ads/ad-slot";
import { BrandMark } from "@/components/brand/brand-mark";
import { RuleSection } from "@/components/rules/rule-section";
import { RULE_ASSUMPTIONS } from "@/lib/game/rules";

export default function RulesPage() {
  return (
    <main className="safe-screen mx-auto min-h-dvh w-full max-w-3xl py-8">
      <div className="flex items-center gap-4">
        <BrandMark size="medium" />
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gold">How to play</p>
          <h1 className="font-display text-5xl sm:text-6xl">Carramba</h1>
        </div>
      </div>
      <div className="mt-8 space-y-3 text-cream/85">
        <RuleSection title="Objective">
          <p>
            Keep your hand value as low as possible. The default table eliminates
            a player above 100 points. The host can choose another maximum before
            the game starts.
          </p>
        </RuleSection>
        <RuleSection title="Cards">
          <p>104 cards: 2 standard decks, no Jokers.</p>
        </RuleSection>
        <RuleSection title="Card values">
          <p>A = 1 · 2–9 = face value · 10/J/Q/K = 10</p>
        </RuleSection>
        <RuleSection title="Valid combinations">
          <ul className="list-disc space-y-1 pl-5">
            <li>Single card</li>
            <li>2–5 cards of the same rank</li>
            <li>3–5 consecutive cards of the same color</li>
          </ul>
        </RuleSection>
        <RuleSection title="Full-hand discard">
          <p>
            You may discard your entire hand if it is a legal combination, then
            draw one card.
          </p>
          <pre className="overflow-x-auto rounded-2xl bg-black/30 p-4 text-sm">
{`9 10 J Q K
↓
discard all 5
↓
draw 1
↓
1 card remaining`}
          </pre>
        </RuleSection>
        <RuleSection title="Carramba">
          <p>
            You can call Carramba only when your hand totals 7 or less. Strictly
            lowest hand = 0 points. Tie or higher hand = hand value + 30.
          </p>
        </RuleSection>
        <RuleSection title="Cumulative score">
          <p>
            The default maximum is 100 and the default reset is 50. A score below
            the maximum stays. An exact maximum becomes the reset score. A score
            above the maximum eliminates the player. Private games, casual games,
            and bot practice do not change your rating. Ranked games do.
          </p>
        </RuleSection>
        <RuleSection title="House assumptions">
          <ol className="list-decimal space-y-1 pl-5">
            {RULE_ASSUMPTIONS.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </RuleSection>
      </div>
      <div className="mt-8">
        <AdSlot placement="rules" />
      </div>
      <Link href="/" className="mt-6 inline-block text-gold">
        Back home
      </Link>
    </main>
  );
}
