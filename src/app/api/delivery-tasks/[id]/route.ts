import { NextResponse } from "next/server";

import { deleteDeliveryTask } from "@/lib/delivery-storage";

type Context = {
  params: Promise<{ id: string }>;
};

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Delivery task request failed.";
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const result = await deleteDeliveryTask(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
