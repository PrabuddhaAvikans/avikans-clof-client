import { useEffect } from "react";

let lockCount = 0;
let previousOverflow = "";

function acquireScrollLock(): void {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

function releaseScrollLock(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
  }
}

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    acquireScrollLock();
    return releaseScrollLock;
  }, [active]);
}
