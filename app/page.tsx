import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-3xl flex-col items-center justify-center overflow-hidden px-6 text-center">
      <p className="text-sm uppercase tracking-[0.4em] text-gold">Play with your friends</p>
      <h1 className="mt-3 bg-gradient-to-r from-[#ffe14a] via-[#ff4fd8] to-[#3ee0ff] bg-clip-text font-display text-6xl tracking-tight text-transparent sm:text-7xl">
        CARRAMBA
      </h1>
      <p className="mt-4 max-w-md text-lg text-cream/75">
        The lower your hand, the better your chances.
      </p>
      <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
        <Link
          href="/lobby/create"
          className="focus-ring rounded-full bg-[var(--gold)] py-3 font-extrabold text-ink shadow-[0_5px_0_#c9a400] transition hover:-translate-y-0.5"
        >
          Create Game
        </Link>
        <Link
          href="/lobby/join"
          className="focus-ring rounded-full bg-[var(--cyan)] py-3 font-extrabold text-ink shadow-[0_5px_0_#0e8eaa] transition hover:-translate-y-0.5"
        >
          Join Game
        </Link>
        <Link href="/rules" className="text-sm text-gold underline-offset-4 hover:underline">
          How to Play
        </Link>
      </div>
    </main>
  );
}
