import { NextResponse } from "next/server";

export function getProvidedOrchestratorKey(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return request.headers.get("x-orchestrator-api-key")?.trim() ?? "";
}

export function validateOrchestratorRequest(request: Request) {
  const expected = process.env.ORCHESTRATOR_API_KEY;

  if (!expected) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "ORCHESTRATOR_API_KEY is not configured." },
        { status: 503 },
      ),
    };
  }

  const provided = getProvidedOrchestratorKey(request);

  if (!provided || provided !== expected) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Invalid or missing orchestrator API key." },
        { status: 401 },
      ),
    };
  }

  return { ok: true as const };
}
