import { cn } from "@/lib/utils";

export type BrandLogoProps = {
  /** Compact square crop for collapsed sidebar */
  compact?: boolean;
  className?: string;
};

/**
 * Renders public/logo.png. On light chrome, black logo canvas is blended out
 * so the Avikans wordmark + gold accent read cleanly.
 */
export function BrandLogo({ compact = false, className }: BrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Avikans"
      className={cn(
        "block shrink-0 object-contain",
        compact ? "h-8 w-8 object-left" : "h-8 w-auto max-w-[148px]",
        "mix-blend-multiply",
        className,
      )}
    />
  );
}
