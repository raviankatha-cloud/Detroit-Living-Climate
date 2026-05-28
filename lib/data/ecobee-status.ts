import "server-only";
import { isSmartBuildingsConfigured } from "@/lib/ecobee/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type EcobeeIntegrationStatus = {
  apiReady: boolean;
  mode: "smartbuildings" | "consumer";
  appKeyConfigured: boolean;
  smartBuildingsConfigured: boolean;
  supabaseConfigured: boolean;
  accountConnected: boolean;
  accountLabel?: string;
  authorizedBy?: string;
  tokenExpiresAt?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncMessage?: string;
};

export async function getEcobeeIntegrationStatus(): Promise<EcobeeIntegrationStatus> {
  const supabase = createServiceSupabaseClient();
  const smartBuildingsConfigured = isSmartBuildingsConfigured();
  const appKeyConfigured = Boolean(process.env.ECOBEE_APP_KEY);
  const mode: "smartbuildings" | "consumer" = smartBuildingsConfigured ? "smartbuildings" : "consumer";

  if (!supabase) {
    return {
      apiReady: smartBuildingsConfigured || Boolean(process.env.ECOBEE_REFRESH_TOKEN),
      mode,
      appKeyConfigured,
      smartBuildingsConfigured,
      supabaseConfigured: false,
      accountConnected: smartBuildingsConfigured || Boolean(process.env.ECOBEE_REFRESH_TOKEN),
      accountLabel: smartBuildingsConfigured ? "SmartBuildings client credentials" : (process.env.ECOBEE_REFRESH_TOKEN ? "env refresh token" : undefined)
    };
  }

  const accountLabel = smartBuildingsConfigured ? "smartbuildings" : "primary";
  const [{ data: token }, { data: syncRun }] = await Promise.all([
    supabase
      .from("ecobee_tokens")
      .select("account_label, refresh_token, expires_at, authorized_by, updated_at")
      .eq("account_label", accountLabel)
      .maybeSingle(),
    supabase
      .from("sync_runs")
      .select("status, message, finished_at, started_at")
      .eq("provider", "ecobee")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const accountConnected = smartBuildingsConfigured
    ? Boolean(token?.account_label)
    : Boolean(token?.refresh_token || process.env.ECOBEE_REFRESH_TOKEN);

  return {
    apiReady: smartBuildingsConfigured || (appKeyConfigured && accountConnected),
    mode,
    appKeyConfigured,
    smartBuildingsConfigured,
    supabaseConfigured: true,
    accountConnected: smartBuildingsConfigured || accountConnected,
    accountLabel: token?.account_label ?? (smartBuildingsConfigured ? "SmartBuildings client credentials" : (process.env.ECOBEE_REFRESH_TOKEN ? "env refresh token" : undefined)),
    authorizedBy: token?.authorized_by ?? undefined,
    tokenExpiresAt: token?.expires_at ? formatDate(token.expires_at) : undefined,
    lastSyncAt: syncRun?.finished_at || syncRun?.started_at ? formatDate(syncRun.finished_at ?? syncRun.started_at) : undefined,
    lastSyncStatus: syncRun?.status ?? undefined,
    lastSyncMessage: syncRun?.message ?? undefined
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

