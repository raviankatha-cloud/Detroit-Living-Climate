import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

// SmartBuildings uses a different token endpoint and client credentials grant.
// Consumer ecobee uses a PIN / OAuth code flow with refresh tokens.
// When SMARTBUILDINGS_CLIENT_ID is set, we prefer SmartBuildings automatically.

export const ECOBEE_API_BASE_URL = process.env.ECOBEE_API_BASE_URL ?? "https://api.ecobee.com";
export const SMARTBUILDINGS_API_BASE = process.env.SMARTBUILDINGS_API_BASE ?? "https://api.sb.ecobee.com";
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export type EcobeeTokenSet = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
};

export type EcobeePinAuthorization = {
  ecobeePin: string;
  code: string;
  scope: string;
  expires_in: number;
  interval: number;
};

// ── SmartBuildings (client credentials) ──────────────────────────────────────

export function isSmartBuildingsConfigured() {
  return Boolean(process.env.SMARTBUILDINGS_CLIENT_ID && process.env.SMARTBUILDINGS_CLIENT_SECRET);
}

function getSmartBuildingsClientId() {
  const value = process.env.SMARTBUILDINGS_CLIENT_ID;
  if (!value) throw new Error("SMARTBUILDINGS_CLIENT_ID is required.");
  return value;
}

function getSmartBuildingsClientSecret() {
  const value = process.env.SMARTBUILDINGS_CLIENT_SECRET;
  if (!value) throw new Error("SMARTBUILDINGS_CLIENT_SECRET is required.");
  return value;
}

async function requestSmartBuildingsAccessToken(): Promise<EcobeeTokenSet> {
  const tokenUrl =
    process.env.SMARTBUILDINGS_TOKEN_URL ?? `${SMARTBUILDINGS_API_BASE}/api/v2/token`;
  const audience =
    process.env.SMARTBUILDINGS_API_AUDIENCE ?? SMARTBUILDINGS_API_BASE;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: getSmartBuildingsClientId(),
      client_secret: getSmartBuildingsClientSecret(),
      audience
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SmartBuildings token request failed: ${response.status} ${text}`);
  }

  return (await response.json()) as EcobeeTokenSet;
}

// ── Consumer ecobee (PIN / OAuth) ─────────────────────────────────────────────

export function getEcobeeAppKey() {
  const value = process.env.ECOBEE_APP_KEY;
  if (!value) throw new Error("ECOBEE_APP_KEY is required.");
  return value;
}

export function getEcobeeRedirectUri() {
  const explicit = process.env.ECOBEE_REDIRECT_URI;
  if (explicit) return explicit;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Set ECOBEE_REDIRECT_URI or NEXT_PUBLIC_APP_URL.");
  return new URL("/api/ecobee/callback", appUrl).toString();
}

export function getEcobeeAuthorizationUrl(state: string) {
  const url = new URL(`${ECOBEE_API_BASE_URL}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", getEcobeeAppKey());
  url.searchParams.set("redirect_uri", getEcobeeRedirectUri());
  url.searchParams.set("scope", process.env.ECOBEE_SCOPE ?? "smartWrite");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function requestEcobeePinAuthorization() {
  const url = new URL(`${ECOBEE_API_BASE_URL}/authorize`);
  url.searchParams.set("response_type", "ecobeePin");
  url.searchParams.set("client_id", getEcobeeAppKey());
  url.searchParams.set("scope", process.env.ECOBEE_SCOPE ?? "smartWrite");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`ecobee PIN authorization failed: ${response.status}`);
  return (await response.json()) as EcobeePinAuthorization;
}

export async function exchangeEcobeeAuthorizationCode(code: string) {
  return requestEcobeeToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: getEcobeeRedirectUri(),
    client_id: getEcobeeAppKey(),
    ecobee_type: "jwt"
  });
}

export async function exchangeEcobeePinCode(code: string) {
  return requestEcobeeToken({
    grant_type: "ecobeePin",
    code,
    client_id: getEcobeeAppKey(),
    ecobee_type: "jwt"
  });
}

export async function refreshEcobeeToken(refreshToken: string) {
  return requestEcobeeToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: getEcobeeAppKey(),
    ecobee_type: "jwt"
  });
}

// ── Token resolution (SmartBuildings preferred) ───────────────────────────────

export async function getValidEcobeeAccessToken() {
  // SmartBuildings path: client credentials, no refresh token needed.
  if (isSmartBuildingsConfigured()) {
    return getValidSmartBuildingsToken();
  }

  // Consumer ecobee path: refresh token required.
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    const envRefreshToken = process.env.ECOBEE_REFRESH_TOKEN;
    return envRefreshToken ? (await refreshEcobeeToken(envRefreshToken)).access_token : null;
  }

  const { data: storedToken } = await supabase
    .from("ecobee_tokens")
    .select("*")
    .eq("account_label", "primary")
    .maybeSingle();

  const envRefreshToken = process.env.ECOBEE_REFRESH_TOKEN;
  const refreshToken = storedToken?.refresh_token ?? envRefreshToken;

  if (!refreshToken) {
    return null;
  }

  const expiresAt = storedToken?.expires_at ? new Date(storedToken.expires_at).getTime() : 0;

  if (storedToken?.access_token && expiresAt - Date.now() > TOKEN_REFRESH_BUFFER_MS) {
    return storedToken.access_token as string;
  }

  const tokenSet = await refreshEcobeeToken(refreshToken);
  await saveEcobeeTokenSet(tokenSet, storedToken?.authorized_by ?? "system");
  return tokenSet.access_token;
}

async function getValidSmartBuildingsToken() {
  const supabase = createServiceSupabaseClient();

  if (supabase) {
    const { data: storedToken } = await supabase
      .from("ecobee_tokens")
      .select("access_token, expires_at")
      .eq("account_label", "smartbuildings")
      .maybeSingle();

    const expiresAt = storedToken?.expires_at ? new Date(storedToken.expires_at).getTime() : 0;

    if (storedToken?.access_token && expiresAt - Date.now() > TOKEN_REFRESH_BUFFER_MS) {
      return storedToken.access_token as string;
    }
  }

  // Request a fresh client credentials token.
  const tokenSet = await requestSmartBuildingsAccessToken();

  if (supabase) {
    const expiresAt = new Date(Date.now() + Math.max(tokenSet.expires_in - 60, 60) * 1000).toISOString();

    await supabase.from("ecobee_tokens").upsert(
      {
        account_label: "smartbuildings",
        access_token: tokenSet.access_token,
        refresh_token: null,
        token_type: tokenSet.token_type ?? "Bearer",
        scope: tokenSet.scope ?? "",
        expires_at: expiresAt,
        authorized_by: "client_credentials",
        updated_at: new Date().toISOString()
      },
      { onConflict: "account_label" }
    );
  }

  return tokenSet.access_token;
}

export async function saveEcobeeTokenSet(tokenSet: EcobeeTokenSet, authorizedBy: string) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return;
  }

  const { data: existingToken } = await supabase
    .from("ecobee_tokens")
    .select("refresh_token")
    .eq("account_label", "primary")
    .maybeSingle();
  const refreshToken = tokenSet.refresh_token ?? existingToken?.refresh_token ?? process.env.ECOBEE_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error("ecobee token response did not include a refresh token.");
  }

  const expiresAt = new Date(Date.now() + Math.max(tokenSet.expires_in - 60, 60) * 1000).toISOString();

  await supabase.from("ecobee_tokens").upsert(
    {
      account_label: "primary",
      access_token: tokenSet.access_token,
      refresh_token: refreshToken,
      token_type: tokenSet.token_type ?? "Bearer",
      scope: tokenSet.scope ?? process.env.ECOBEE_SCOPE ?? "smartWrite",
      expires_at: expiresAt,
      authorized_by: authorizedBy,
      updated_at: new Date().toISOString()
    },
    { onConflict: "account_label" }
  );
}

async function requestEcobeeToken(params: Record<string, string>) {
  const response = await fetch(`${ECOBEE_API_BASE_URL}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ecobee token request failed: ${response.status} ${text}`);
  }

  return (await response.json()) as EcobeeTokenSet;
}
