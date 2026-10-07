"use client";

import type { ReactNode } from "react";
import { useAdaptiveDevice } from "@/components/providers/adaptive-device";

export function RuleSection({ title, children }: { title: string; children: ReactNode }) {
  const { isMobile } = useAdaptiveDevice();

  return (
    <details
      open={!isMobile}
      className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
    >
      <summary className="cursor-pointer font-display text-2xl text-cream sm:text-3xl">
        {title}
      </summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}
