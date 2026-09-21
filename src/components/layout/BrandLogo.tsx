import { useSystemSettings } from "@/hooks/useSystemSettings";
import { resolveSystemLogoUrl } from "@/lib/systemSettings";
import { cn } from "@/lib/utils";

export type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, className }: BrandLogoProps) {
  const settings = useSystemSettings();
  const custom = Boolean(settings.logoUrl);

  const companyName = settings.companyName || "Avikans";

  return (
    <img
      src={resolveSystemLogoUrl(settings.logoUrl)}
      alt={companyName}
      title={companyName}
      className={cn(
        "block shrink-0 object-contain",
        compact ? "h-8 w-8 object-left" : "h-8 w-auto max-w-[148px]",
        !custom && "mix-blend-multiply",
        className,
      )}
    />
  );
}
