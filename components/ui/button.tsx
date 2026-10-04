import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";

const styles: Record<Variant, string> = {
  primary:
    "bg-[var(--gold)] text-ink shadow-[0_4px_0_#c9a400] hover:-translate-y-0.5 hover:bg-[var(--gold-strong)] active:translate-y-0.5 active:shadow-none disabled:bg-gold/40 disabled:text-ink/40 disabled:shadow-none",
  secondary:
    "border-2 border-white/30 bg-[var(--cyan)] text-ink shadow-[0_4px_0_#0e8eaa] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:shadow-none",
  ghost: "text-cream hover:bg-white/15 disabled:opacity-40",
  danger:
    "bg-[var(--danger)] text-white shadow-[0_4px_0_#b4233d] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:shadow-none",
  gold: "bg-[var(--magenta)] text-white shadow-[0_4px_0_#b42386] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:shadow-none",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold tracking-wide transition disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
