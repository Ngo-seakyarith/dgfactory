import { NextResponse } from "next/server";

import { deleteDeliveryTask } from "@/lib/delivery-storage";
import { requireApproved } from "@/lib/route-guards";

type Context = {
  params: Promise<{ id: string }>;
};

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Delivery task request failed.";
}

export async function DELETE(request: Request, context: Context) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const result = await deleteDeliveryTask(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
