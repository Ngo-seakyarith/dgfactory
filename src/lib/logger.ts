import { saveAuditLog } from "@/lib/audit";

export function friendlyError(error: unknown, defaultMessage: string) {
  return error instanceof Error ? error.message : defaultMessage;
}

export async function logServerError({
  actor = "system",
  route,
  error,
  metadata = {},
}: {
  actor?: string;
  route: string;
  error: unknown;
  metadata?: Record<string, unknown>;
}) {
  const message = friendlyError(error, "Unknown server error.");
  console.error(`[DG Factory] ${route}: ${message}`);

  await saveAuditLog({
    actor,
    action: "server_error",
    entityType: "route",
    entityId: route,
    metadata: {
      message,
      ...metadata,
    },
  });
}
