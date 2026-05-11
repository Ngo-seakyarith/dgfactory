import { NextResponse } from "next/server";

import {
  deleteDeliveryProject,
  getDeliveryProject,
} from "@/lib/delivery-storage";

type Context = {
  params: Promise<{ id: string }>;
};

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Delivery project request failed.";
}

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const project = await getDeliveryProject(id);

    if (!project) {
      return NextResponse.json(
        { error: "Delivery project not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const result = await deleteDeliveryProject(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
