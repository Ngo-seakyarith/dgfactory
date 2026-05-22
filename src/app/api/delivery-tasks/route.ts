import { NextResponse } from "next/server";

import { listDeliveryTasks, saveDeliveryTask } from "@/lib/delivery-storage";
import type { DeliveryTask } from "@/lib/delivery";
import { requireApproved } from "@/lib/route-guards";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Delivery task request failed.";
}

export async function GET(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const deliveryProjectId = url.searchParams.get("deliveryProjectId") ?? undefined;
    const tasks = await listDeliveryTasks(deliveryProjectId);
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Partial<DeliveryTask>;

    if (!body.deliveryProjectId?.trim() || !body.title?.trim()) {
      return NextResponse.json(
        { error: "Delivery project and task title are required." },
        { status: 400 },
      );
    }

    const result = await saveDeliveryTask(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
