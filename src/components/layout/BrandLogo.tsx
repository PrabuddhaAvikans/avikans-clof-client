import { cn } from "@/lib/utils";

export type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, className }: BrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Avikans"
      className={cn(
        "block shrink-0 object-contain",
        compact ? "h-8 w-8 object-left" : "h-8 w-auto max-w-[148px]",
        "mix-blend-multiply", // knock out black canvas on light bg
        className,
      )}
    />
  );
}
