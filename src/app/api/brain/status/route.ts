import { NextResponse } from "next/server";

import { getBrainModelStatus } from "@/lib/brain/core/modelConfig";

export async function GET() {
  return NextResponse.json(getBrainModelStatus());
}
