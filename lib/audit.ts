import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type AuditEvent = {
  actorUserId: string;
  buildingId?: string;
  action: string;
  metadata?: Record<string, unknown>;
};

export async function logAuditEvent(event: AuditEvent) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    console.info("Demo audit event", event);
    return;
  }

  await supabase.from("audit_logs").insert({
    actor_user_id: event.actorUserId,
    building_id: event.buildingId,
    action: event.action,
    metadata: event.metadata ?? {}
  });
}
