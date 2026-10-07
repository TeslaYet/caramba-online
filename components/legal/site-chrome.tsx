"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConsentBanner } from "@/components/legal/consent-banner";

const LINKS = [
  ["/legal/privacy", "Privacy"],
  ["/legal/terms", "Terms"],
  ["/legal/mentions", "Legal notice"],
  ["/legal/cookies", "Cookies"],
  ["/legal/premium", "Premium"],
  ["/premium", "Plans"],
] as const;

export function SiteChrome() {
  const pathname = usePathname();
  const hide = pathname.startsWith("/room") || pathname.startsWith("/game");

  return (
    <>
      {!hide && (
        <footer className="mt-auto border-t border-[var(--line)] px-4 py-6 text-center text-xs text-cream/60">
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href} className="underline">
                {label}
              </Link>
            ))}
          </nav>
          <p className="mt-3">Legal pages are drafts until the bracketed publisher fields are filled in.</p>
        </footer>
      )}
      <ConsentBanner />
    </>
  );
}
