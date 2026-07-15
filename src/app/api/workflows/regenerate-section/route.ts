import { NextResponse } from "next/server";

import {
  regeneratePackageSection,
  type RegeneratablePackageSection,
} from "@/lib/brain/generation/regeneratePackageSection";
import { getTrainerById } from "@/features/training-packages";

const sections: RegeneratablePackageSection[] = [
  "syllabus",
  "proposal",
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      section?: RegeneratablePackageSection;
      packageInput?: Parameters<typeof regeneratePackageSection>[0]["packageInput"];
    };

    if (!body.section || !sections.includes(body.section)) {
      return NextResponse.json(
        { error: "A valid regeneratable section is required." },
        { status: 400 },
      );
    }

    if (!body.packageInput) {
      return NextResponse.json(
        { error: "Package input is required." },
        { status: 400 },
      );
    }

    if (!getTrainerById(body.packageInput.proposalBrief?.trainerId ?? "")) {
      return NextResponse.json(
        { error: "Select a DG Academy trainer before regenerating the package." },
        { status: 400 },
      );
    }

    const result = await regeneratePackageSection({
      section: body.section,
      packageInput: body.packageInput,
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
