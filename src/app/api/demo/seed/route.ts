import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { seedDemoData } from "@/lib/demo-data";
import { requirePermission } from "@/lib/route-guards";

export async function POST(request: Request) {
  const auth = requirePermission(request, "seed_demo_data");

  if (!auth.ok) {
    return auth.response;
  }

  const data = await seedDemoData(auth.user.actor);

  await saveAuditLog({
    actor: auth.user.actor,
    action: "demo_data_seeded",
    entityType: "demo_data",
    entityId: data.package.id,
    metadata: {
      clientId: data.client.id,
      opportunityId: data.opportunity.id,
      packageId: data.package.id,
      deliveryProjectId: data.deliveryProject.id,
    },
  });

  return NextResponse.json({
    data,
    note: "Demo data was created by explicit admin action. It is never loaded automatically.",
  });
}
