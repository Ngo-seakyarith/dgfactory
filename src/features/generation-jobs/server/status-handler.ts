import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApproved } from "@/lib/route-guards";

import { isGenerationJobType } from "../domain/types";
import { findLatestGenerationJob } from "../storage/generation-job-storage";

const uuidSchema = z.string().uuid();

export async function getLatestGenerationJobRequest(request: Request) {
  try {
    const auth = await requireApproved(request);
    if (!auth.ok) return auth.response;
    const search = new URL(request.url).searchParams;
    const jobType = search.get("jobType");
    const resourceId = search.get("resourceId")?.trim();
    const target = search.has("target") ? search.get("target") ?? "" : undefined;
    if (!isGenerationJobType(jobType) || !resourceId) {
      return NextResponse.json(
        { error: "jobType and resourceId are required." },
        { status: 400 },
      );
    }
    if (!uuidSchema.safeParse(resourceId).success) {
      return NextResponse.json(
        { error: "resourceId must be a valid UUID." },
        { status: 400 },
      );
    }
    const job = await findLatestGenerationJob({ jobType, resourceId, target });
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Generation status could not be loaded.",
      },
      { status: 500 },
    );
  }
}
