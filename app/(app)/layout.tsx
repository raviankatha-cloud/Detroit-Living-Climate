import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import type { Route } from "next";
import { getUserRole } from "@/lib/auth/permissions";
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
  const { userId } = await auth();
  const role = userId ? await getUserRole(userId) : "read_only";
  const visibleNavItems = navItems.filter((item) => {
    if (item.href === "/setup") {
      return role === "super_admin";
    }

    return true;
  });

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>{APP_NAME}</h1>
          <p>{APP_SUBTITLE}</p>
          <span>{APP_DOMAIN}</span>
        </div>
        <nav className="nav-links" aria-label="Primary navigation">
          {visibleNavItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <UserButton afterSignOutUrl="/sign-in" />
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
