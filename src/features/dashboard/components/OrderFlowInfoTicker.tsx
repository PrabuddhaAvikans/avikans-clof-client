import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type OrderFlowInfoTickerProps = {
  messages: string[];
  className?: string;
};

export function OrderFlowInfoTicker({ messages, className }: OrderFlowInfoTickerProps) {
  const items = messages.filter((message) => message.trim().length > 0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [items.join("|")]);

  useEffect(() => {
    if (items.length <= 1 || paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [items.length, paused, reducedMotion]);

  if (items.length === 0) {
    return (
      <div className={cn("order-flow-ticker text-muted-foreground", className)}>
        No updates
      </div>
    );
  }

  const message = items[Math.min(index, items.length - 1)] ?? items[0];
  const shouldScroll = !reducedMotion && message.length > 42;

  return (
    <div
      className={cn("order-flow-ticker", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      title={message}
      aria-live="polite"
    >
      <div
        key={`${index}-${message}`}
        className={cn(
          "order-flow-ticker__track",
          shouldScroll && !paused && "order-flow-ticker__track--scroll",
          reducedMotion && "order-flow-ticker__track--static",
        )}
      >
        <span className="order-flow-ticker__text">{message}</span>
        {shouldScroll ? (
          <span className="order-flow-ticker__text" aria-hidden>
            {message}
          </span>
        ) : null}
      </div>
    </div>
  );
}
