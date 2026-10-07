export function LegalDraft({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="safe-screen mx-auto w-full max-w-2xl py-10 text-sm leading-6 text-cream/85">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">Draft for review</p>
      <h1 className="mt-2 font-display text-5xl text-cream">{title}</h1>
      <p className="mt-4 rounded-2xl border border-[var(--line)] bg-black/20 p-4 text-cream/70">
        Bracketed fields are not filled in. This page describes the Carramba code as of 7 October 2026.
        It is not a statement that the site is legally compliant. A qualified professional should review it
        before you rely on it.
      </p>
      <div className="mt-8 space-y-4">{children}</div>
    </main>
  );
}
