import { NextResponse } from "next/server";

import {
  regeneratePackageSection,
  type RegeneratablePackageSection,
} from "@/lib/brain/workflows/packageWorkflow";
import type { TrainingPackageOutputs } from "@/lib/training-packages";

const sections: RegeneratablePackageSection[] = [
  "syllabus",
  "proposal",
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      section?: RegeneratablePackageSection;
      packageInput?: Parameters<typeof regeneratePackageSection>[0]["packageInput"];
      currentPackage?: TrainingPackageOutputs;
    };

    if (!body.section || !sections.includes(body.section)) {
      return NextResponse.json(
        { error: "A valid regeneratable section is required." },
        { status: 400 },
      );
    }

    if (!body.packageInput || !body.currentPackage) {
      return NextResponse.json(
        { error: "Package input and current package outputs are required." },
        { status: 400 },
      );
    }

    const result = await regeneratePackageSection({
      section: body.section,
      packageInput: body.packageInput,
      currentPackage: body.currentPackage,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Section regeneration failed.",
      },
      { status: 500 },
    );
  }
}
