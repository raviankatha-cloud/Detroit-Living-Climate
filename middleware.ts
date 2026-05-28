import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/api/webhooks/clerk(.*)"]);

const clerkReady =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_")) &&
  Boolean(process.env.CLERK_SECRET_KEY?.startsWith("sk_"));

export default clerkMiddleware(async (auth, req) => {
  if (!clerkReady) return;

  if (!isPublicRoute(req)) {
    await auth.protect({ unauthenticatedUrl: new URL("/sign-in", req.url).toString() });
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)"]
};
