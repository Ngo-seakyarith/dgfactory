import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import {
  getTrainingPackage,
  listTrainingPackages,
  saveTrainingPackage,
} from "@/lib/training-storage";
import type { TrainingPackage } from "@/lib/training-packages";
import { requirePermission } from "@/lib/route-guards";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Training package request failed.";
}

export async function GET() {
  try {
    const packages = await listTrainingPackages();
    return NextResponse.json({ packages });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "manage_proposals");

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as TrainingPackage;

    if (!body.id || !body.title || !body.syllabus) {
      return NextResponse.json(
        { error: "A generated package with id, title, and outputs is required." },
        { status: 400 },
      );
    }

    const existing = await getTrainingPackage(body.id);
    const result = await saveTrainingPackage(body);
    await saveAuditLog({
      actor: auth.user.actor,
      action: "package_saved",
      entityType: "training_package",
      entityId: result.package.id,
      metadata: {
        title: result.package.title,
        client: result.package.client,
        storage: result.storage,
      },
    });

    if (
      existing &&
      JSON.stringify(existing.pricingInputs) !==
        JSON.stringify(result.package.pricingInputs)
    ) {
      await saveAuditLog({
        actor: auth.user.actor,
        action: "pricing_change",
        entityType: "training_package",
        entityId: result.package.id,
        metadata: {
          title: result.package.title,
          client: result.package.client,
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
