export function isClerkConfigured() {
  return (
    isValidClerkPublishableKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    isValidClerkSecretKey(process.env.CLERK_SECRET_KEY)
  );
}

function isValidClerkPublishableKey(value: string | undefined) {
  return Boolean(value && /^(pk_test_|pk_live_)/.test(value));
}

function isValidClerkSecretKey(value: string | undefined) {
  return Boolean(value && /^(sk_test_|sk_live_)/.test(value));
}
