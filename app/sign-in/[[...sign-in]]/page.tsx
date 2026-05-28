import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { isClerkConfigured } from "@/lib/auth/clerk-config";
import { APP_DOMAIN, APP_NAME, APP_SUBTITLE } from "@/lib/brand";

export default function SignInPage() {
  const clerkReady = isClerkConfigured();

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <span className="eyebrow">{APP_DOMAIN}</span>
        <h1>{APP_NAME}</h1>
        <p>{APP_SUBTITLE}</p>
        {clerkReady ? <SignIn routing="path" path="/sign-in" /> : <ClerkSetupRequired />}
      </section>
    </main>
  );
}

function ClerkSetupRequired() {
  return (
    <div className="setup-required-panel">
      <span className="status-pill warning">Clerk setup required</span>
      <h2>Connect authentication to open the internal dashboard.</h2>
      <p>
        Add real Clerk keys to <code>.env.local</code>, then restart the dev server. The app is running,
        but secure sign-in is waiting on your Clerk account values.
      </p>
      <div className="env-list">
        <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...</code>
        <code>CLERK_SECRET_KEY=sk_test_...</code>
      </div>
      <Link className="button primary" href="https://dashboard.clerk.com" target="_blank">
        Open Clerk dashboard
      </Link>
    </div>
  );
}
