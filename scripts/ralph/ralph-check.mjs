import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { getNextStory, progressPath, readPrd, repoRoot } from "./ralph-utils.mjs";

try {
  const prd = readPrd();
  const nextStory = getNextStory(prd);
  const archivePath = resolve(repoRoot, "tasks", "archive");
  const promptPath = resolve(repoRoot, "scripts", "ralph", "prompt.md");

  if (!existsSync(progressPath)) {
    throw new Error("tasks/progress.txt is missing.");
  }

  if (!existsSync(archivePath)) {
    throw new Error("tasks/archive is missing.");
  }

  if (!existsSync(promptPath)) {
    throw new Error("scripts/ralph/prompt.md is missing.");
  }

  console.log("Ralph task files are valid.");
  console.log(`Project: ${prd.project}`);
  console.log(`Pending story: ${nextStory ? `${nextStory.id} - ${nextStory.title}` : "none"}`);
  console.log("");
  console.log("Run quality checks before any commit:");
  console.log("- npm run lint");
  console.log("- npm run typecheck");
  console.log("- npm test");
  console.log("- npm run build");
  console.log("");
  console.log("This check script does not mark passes=true and does not commit.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
