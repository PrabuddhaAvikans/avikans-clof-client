import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PageContainerProps = {
  children: ReactNode;
  className?: string;
  maxWidth?: "default" | "wide" | "full";
};

const maxWidthClasses = {
  default: "max-w-[100rem]",
  wide: "max-w-none",
  full: "max-w-none",
} as const;

export function PageContainer({
  children,
  className,
  maxWidth = "wide",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-4 sm:px-5 lg:px-6",
        maxWidthClasses[maxWidth],
        className,
      )}
    >
      {children}
    </div>
  );
}
