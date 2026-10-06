import { initialsForName } from "@/lib/userAvatar";
import { cn } from "@/lib/utils";
import { SecureImage } from "@/components/ui/SecureImage";

export type UserAvatarProps = {
  name: string;
  avatarFileKey?: string | null;
  className?: string;
  size?: "sm" | "md";
};

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
} as const;

export function UserAvatar({
  name,
  avatarFileKey,
  className,
  size = "md",
}: UserAvatarProps) {
  const initials = (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-foreground font-semibold text-background",
        sizeClasses[size],
        className,
      )}
      aria-hidden
    >
      {initialsForName(name || "User")}
    </span>
  );

  return (
    <SecureImage
      fileKey={avatarFileKey}
      alt=""
      className={cn("shrink-0 rounded-full object-cover", sizeClasses[size], className)}
      fallback={initials}
    />
  );
}
