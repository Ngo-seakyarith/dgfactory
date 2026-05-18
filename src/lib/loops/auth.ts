import { NextResponse } from "next/server";

export function getProvidedLoopKey(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  return request.headers.get("x-loop-api-key")?.trim() || bearer || "";
}

export function validateLoopRequest(request: Request) {
  const expectedLoopKey = process.env.LOOP_API_KEY;
  const provided = getProvidedLoopKey(request);

  if (!expectedLoopKey) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "LOOP_API_KEY is not configured." },
        { status: 503 },
      ),
    };
  }

  if (!provided || provided !== expectedLoopKey) {
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
