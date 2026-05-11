import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
export const prdPath = resolve(repoRoot, "tasks", "prd.json");
export const progressPath = resolve(repoRoot, "tasks", "progress.txt");

export function readPrd() {
  if (!existsSync(prdPath)) {
    throw new Error(`Missing task file: ${prdPath}`);
  }

  const prd = JSON.parse(readFileSync(prdPath, "utf8"));
  validatePrd(prd);
  return prd;
}

export function validatePrd(prd) {
  const errors = [];

  if (!prd || typeof prd !== "object") {
    throw new Error("prd.json must be a JSON object.");
  }

  if (typeof prd.project !== "string" || !prd.project.trim()) {
    errors.push("project must be a non-empty string");
  }

  if (typeof prd.branchName !== "string" || !prd.branchName.trim()) {
    errors.push("branchName must be a non-empty string");
  }

  if (!Array.isArray(prd.stories)) {
    errors.push("stories must be an array");
  } else {
    prd.stories.forEach((story, index) => {
      const prefix = `stories[${index}]`;

      [
        "id",
        "title",
        "description",
        "notes",
      ].forEach((field) => {
        if (typeof story[field] !== "string") {
          errors.push(`${prefix}.${field} must be a string`);
        }
      });

      if (typeof story.priority !== "number") {
        errors.push(`${prefix}.priority must be a number`);
      }

      [
        "acceptanceCriteria",
        "filesLikelyTouched",
        "testCommands",
      ].forEach((field) => {
        if (!Array.isArray(story[field])) {
          errors.push(`${prefix}.${field} must be an array`);
        }
      });

      if (typeof story.passes !== "boolean") {
        errors.push(`${prefix}.passes must be a boolean`);
      }
    });
  }

  if (errors.length) {
    throw new Error(`Invalid prd.json:\n- ${errors.join("\n- ")}`);
  }
}

export function getNextStory(prd) {
  return [...prd.stories]
    .filter((story) => story.passes === false)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))[0] ?? null;
}

export function safeBranchName(branchName) {
  return branchName
    .toLowerCase()
    .replace(/^codex\//, "")
    .replace(/[^a-z0-9._/-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "ralph-story";
}

export function formatStoryPrompt(prd, story) {
  return [
    `Project: ${prd.project}`,
    `Story: ${story.id} - ${story.title}`,
    "",
    "Implement exactly one story from tasks/prd.json.",
    "Do not deploy, send external messages, delete important files, bypass tests, or commit secrets.",
    "Keep the DG Academy Training Factory standalone.",
    "",
    "Description:",
    story.description,
    "",
    "Acceptance criteria:",
    ...(story.acceptanceCriteria.length
      ? story.acceptanceCriteria.map((item) => `- ${item}`)
      : ["- No explicit acceptance criteria listed. Ask for clarification if risky."]),
    "",
    "Files likely touched:",
    ...(story.filesLikelyTouched.length
      ? story.filesLikelyTouched.map((item) => `- ${item}`)
      : ["- Discover from repo context."]),
    "",
    "Validation commands:",
    ...(story.testCommands.length
      ? story.testCommands.map((item) => `- ${item}`)
      : [
          "- npm run lint",
          "- npm run typecheck",
          "- npm test",
          "- npm run build",
        ]),
  ].join("\n");
}

export function printSafetyRules() {
  console.log("Safety rails:");
  console.log("- One story per iteration.");
  console.log("- No automatic deployment or production database migration.");
  console.log("- No deletion of important files.");
  console.log("- No external messages.");
  console.log("- No committing secrets.");
  console.log("- No marking passes=true until checks pass.");
  console.log("- Human review is required before merge.");
}
