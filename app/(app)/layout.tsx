import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import type { Route } from "next";
import { isClerkConfigured } from "@/lib/auth/clerk-config";
import { APP_DOMAIN, APP_NAME, APP_SUBTITLE } from "@/lib/brand";

const navItems: Array<{ href: Route; label: string }> = [
  { href: "/dashboard", label: "Command" },
  { href: "/setup", label: "Setup" },
  { href: "/devices", label: "Thermostats/Sensors" },
  { href: "/alerts", label: "Alerts" },
  { href: "/audit", label: "Audit" },
  { href: "/settings", label: "Settings" }
];

export default async function InternalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const clerkReady = isClerkConfigured();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>{APP_NAME}</h1>
          <p>{APP_SUBTITLE}</p>
          <span>{APP_DOMAIN}</span>
        </div>
        <nav className="nav-links" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="topbar-right">
          {clerkReady ? <UserButton afterSignOutUrl="/sign-in" /> : null}
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
