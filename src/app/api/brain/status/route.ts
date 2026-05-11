import { NextResponse } from "next/server";

import { getBrainModelStatus } from "@/lib/brain/modelConfig";

export async function GET() {
  return NextResponse.json(getBrainModelStatus());
}
