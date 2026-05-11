import { NextResponse } from "next/server";

import {
  listDeliveryProjects,
  saveDeliveryProject,
} from "@/lib/delivery-storage";
import type { DeliveryProject } from "@/lib/delivery";

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Delivery project request failed.";
}

export async function GET() {
  try {
    const projects = await listDeliveryProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<DeliveryProject>;

    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "Delivery project title is required." },
        { status: 400 },
      );
    }

    const result = await saveDeliveryProject(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
