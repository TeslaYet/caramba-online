import Image from "next/image";
import { cn } from "@/lib/utils/cn";

const SIZES = {
  hero: "h-auto max-h-[42dvh] w-auto max-w-[min(78vw,22rem)] [@media(max-height:520px)]:max-h-16",
  medium: "h-16 w-16",
  compact: "h-11 w-11",
} as const;

export function BrandMark({
  size = "compact",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const hero = size === "hero";

  return (
    <Image
      src={hero ? "/brand/carramba-logo-v2.webp" : "/brand/carramba-mark-v2.webp"}
      alt={hero ? "Carramba" : ""}
      width={hero ? 768 : 256}
      height={hero ? 768 : 256}
      priority={hero}
      className={cn("object-contain", SIZES[size], className)}
    />
  );
}
