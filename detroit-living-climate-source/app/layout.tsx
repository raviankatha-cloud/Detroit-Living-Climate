import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";
import { isClerkConfigured } from "@/lib/auth/clerk-config";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!isClerkConfigured()) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }

  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
