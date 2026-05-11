import { NextResponse } from "next/server";

import { getProvidedOrchestratorKey } from "@/lib/orchestrator/auth";

export function getProvidedLoopKey(request: Request) {
  return (
    request.headers.get("x-loop-api-key")?.trim() ||
    getProvidedOrchestratorKey(request)
  );
}

export function validateLoopRequest(request: Request) {
  const expectedLoopKey = process.env.LOOP_API_KEY;
  const expectedOrchestratorKey = process.env.ORCHESTRATOR_API_KEY;
  const provided = getProvidedLoopKey(request);

  if (!expectedLoopKey && !expectedOrchestratorKey) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "LOOP_API_KEY or ORCHESTRATOR_API_KEY is not configured." },
        { status: 503 },
      ),
    };
  }

  if (
    !provided ||
    (provided !== expectedLoopKey && provided !== expectedOrchestratorKey)
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Invalid or missing loop API key." },
        { status: 401 },
      ),
    };
  }

  return { ok: true as const };
}
