import { describe, expect, test } from "bun:test";
import { load } from "cheerio";
import JSZip from "jszip";

import { createPostTrainingReportDocx } from "@/features/delivery/export/post-training-report-docx";
import { proposalContentFromMarkdown } from "../domain/proposal-content";
import { buildPackageFromParts, createTrainingOutputTemplate, type TrainingPackageInput } from "../domain/training-package";
import { createDocx } from "./docx";
import { createPptx, parseDeckSections } from "./pptx";
import { parseSlideDeckPlan, serializeSlideDeckPlan } from "./slide-deck-plan";

function examplePackage() {
  const input: TrainingPackageInput = {
    courseTitle: "Practical Training", client: "Example Client", audience: "Managers",
    duration: "Half Day", context: "Practical exercises", tone: "Clear",
  };
  return buildPackageFromParts({
    input, outputs: createTrainingOutputTemplate(input),
    pricingInputs: { numberOfParticipants: 20, professionalFee: 1200, vatStatus: "Excluding VAT" },
  });
}

describe("saved Markdown compatibility", () => {
  test("reads older proposal sections using semantic Markdown nodes", () => {
    const content = proposalContentFromMarkdown(
      "## Course Overview\n\nA **practical** workshop.\n\n## Course Objectives\n\n1. Understand the method\n2. Apply it\n\n## Content Outlines\n\n- Session 1 | Foundations; Key terms\n- Break | 15 minutes\n\n## Who Should Attend\n\nManagers",
      { title: "Course", client: "Example Client", audience: "Managers", duration: "Half day" },
    );
    expect(content.courseOverview).toEqual(["A practical workshop."]);
    expect(content.courseObjectives).toEqual(["Understand the method", "Apply it"]);
    expect(content.contentOutlines).toEqual(["Session 1 | Foundations; Key terms", "Break | 15 minutes"]);
    expect(content.whoShouldAttend).toEqual(["Managers"]);
  });

  test("reads older slide headings, nested bullets, and numbered instructions", () => {
    const sections = parseDeckSections("# Course\n\n## Module 1\n\n- **Concept**\n  - Example\n\n## Practice\n\n1. Prepare\n2. Verify");
    expect(sections).toEqual([
      { title: "Module 1", items: [{ kind: "bullet", text: "Concept" }, { kind: "bullet", text: "Example" }] },
      { title: "Practice", items: [{ kind: "number", text: "Prepare" }, { kind: "number", text: "Verify" }] },
    ]);
  });

  test("retains explicit Slide N labels used by older decks", () => {
    expect(parseDeckSections("Slide 1: Foundations\nIntroduction\nSlide 2: Practice\nDeliver a brief")).toEqual([
      { title: "Foundations", items: [{ kind: "paragraph", text: "Introduction" }] },
      { title: "Practice", items: [{ kind: "paragraph", text: "Deliver a brief" }] },
    ]);
  });

  test("retains literal bullet characters in legacy non-Markdown slide outlines", () => {
    expect(parseDeckSections("## Foundations\n\n\u2022 First concept\n\u2022 Second concept")).toEqual([
      { title: "Foundations", items: [{ kind: "bullet", text: "First concept" }, { kind: "bullet", text: "Second concept" }] },
    ]);
  });

  test("keeps version-2 structured deck markers and plans unchanged", () => {
    const saved = serializeSlideDeckPlan({
      title: "Existing deck", subtitle: "Training", slides: [{ layout: "bullets", title: "Existing lesson", bullets: ["Original content"], speakerNotes: "Original notes" }],
    });
    const plan = parseSlideDeckPlan(saved);
    expect(plan?.version).toBe(2);
    expect(plan?.slides[0]?.bullets).toEqual(["Original content"]);
    expect(plan?.slides[0]?.speakerNotes).toBe("Original notes");
    expect(serializeSlideDeckPlan(plan)).toBe(saved);
  });

  test("exports older Markdown material with real lists, formatting, and tables", async () => {
    const pkg = examplePackage();
    pkg.followUpEmail = "## Next Steps\n\n**Review** the result.\n\n- First task\n  - Nested check\n\n| Owner | Action |\n| --- | --- |\n| Manager | Verify |";
    const zip = await JSZip.loadAsync(await createDocx(pkg, "follow-up-email"));
    const xml = load(await zip.file("word/document.xml")!.async("string"), { xmlMode: true });
    expect(xml("w\\:t").text()).toContain("Next Steps");
    expect(xml("w\\:r").filter((_, run) => xml(run).find("w\\:t").text() === "Review").find("w\\:b").length).toBe(1);
    expect(xml("w\\:numPr").length).toBe(2);
    expect(xml("w\\:tbl").length).toBe(1);
    expect(await zip.file("word/footer1.xml")!.async("string")).toContain("www.thedgacademy.org");
  });

  test("keeps structured proposal branding and deterministic commercial pricing", async () => {
    const zip = await JSZip.loadAsync(await createDocx(examplePackage(), "proposal"));
    const xml = load(await zip.file("word/document.xml")!.async("string"), { xmlMode: true });
    const text = xml("w\\:t").text();
    expect(text).toContain("Customized Training Proposal");
    expect(text).toContain("Practical Training");
    expect(text).toContain("$1,200.00");
    expect(text).toContain("Executive Director");
    expect(xml("w\\:drawing").length).toBeGreaterThan(0);
    expect(await zip.file("word/footer1.xml")!.async("string")).toContain("www.thedgacademy.org");
  });

  test("exports reports through the same parser while retaining their branded cover", async () => {
    const zip = await JSZip.loadAsync(await createPostTrainingReportDocx({
      title: "Practical Training", client: "Example Client", updatedAt: "2026-09-29T08:00:00Z",
      participantCount: 20, trainingDate: "29 Sep 2026", trainingTime: "8:00 AM - 12:00 PM",
      venue: "Training room", trainerName: "Example Trainer",
      reportMarkdown: "# Post-Training Report\n\n## Findings\n\nAverage satisfaction: **4.5 / 5**\n\n1. Continue practice\n2. Review outcomes\n\n| Measure | Result |\n| --- | --- |\n| Responses | 20 |",
    }));
    const xml = load(await zip.file("word/document.xml")!.async("string"), { xmlMode: true });
    const text = xml("w\\:t").text();
    expect(text).toContain("POST-TRAINING REPORT");
    expect(text).not.toContain("Post-Training Report");
    expect(text).toContain("Program at a Glance");
    expect(text).toContain("4.5 / 5");
    expect(xml("w\\:numPr").length).toBe(2);
    expect(xml("w\\:tbl").length).toBe(2);
    expect(await zip.file("word/footer1.xml")!.async("string")).toContain("www.thedgacademy.org");
  });

  test("re-exports a saved version-2 deck with its original slide content and notes", async () => {
    const pkg = examplePackage();
    pkg.deckOutline = serializeSlideDeckPlan({
      title: "Existing deck", subtitle: "Training", slides: [{
        layout: "bullets", title: "Existing lesson", bullets: ["Original content"], speakerNotes: "Original notes",
      }],
    });
    const zip = await JSZip.loadAsync(await createPptx(pkg));
    const slidePaths = Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path));
    const slides = (await Promise.all(slidePaths.map((path) => zip.file(path)!.async("string")))).join("\n");
    const notesPaths = Object.keys(zip.files).filter((path) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(path));
    const notes = (await Promise.all(notesPaths.map((path) => zip.file(path)!.async("string")))).join("\n");
    expect(slides).toContain("Existing lesson");
    expect(slides).toContain("Original content");
    expect(slides).not.toContain("dg-slide-deck:");
    expect(notes).toContain("Original notes");
  });
});
