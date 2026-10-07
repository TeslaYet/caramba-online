import { cn } from "@/lib/utils/cn";
import type { MedalPlace } from "@/lib/ui/standings";

const FACE: Record<MedalPlace, string> = {
  gold: "bg-[radial-gradient(circle_at_32%_28%,#fff4cc,#ffc533_46%,#a56b12)] text-[#3a2508]",
  silver: "bg-[radial-gradient(circle_at_32%_28%,#ffffff,#d7dbe3_52%,#7e8694)] text-[#243044]",
  bronze: "bg-[radial-gradient(circle_at_32%_28%,#f8d7b0,#cd7f32_50%,#6d3d16)] text-[#2a1408]",
};

export function Medal({
  place,
  rank,
  muted = false,
}: {
  place: MedalPlace | null;
  rank: number;
  muted?: boolean;
}) {
  if (!place) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center text-xs font-bold tabular-nums text-cream/45">
        {rank}
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold shadow-[inset_0_-2px_0_rgba(0,0,0,0.25),0_2px_0_rgba(255,255,255,0.35)]",
        FACE[place],
        muted && "opacity-45 grayscale",
      )}
    >
      {rank}
    </span>
  );
}
