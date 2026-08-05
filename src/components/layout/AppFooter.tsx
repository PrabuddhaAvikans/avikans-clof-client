export function AppFooter() {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { label: "Privacy Policy", href: "#privacy" },
    { label: "Terms of Use", href: "#terms" },
    { label: "Security Policy", href: "#security" },
    { label: "Support", href: "#support" },
  ] as const;

  return (
    <footer className="shrink-0 border-t border-border bg-card px-4 py-2 sm:px-5">
      <div className="flex flex-col items-center justify-between gap-1.5 text-[11px] text-muted-foreground sm:flex-row">
        <p>
          © {currentYear} Avikans Solution. All rights reserved.{" "}
          <span className="text-foreground/60">v1.0.0</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
