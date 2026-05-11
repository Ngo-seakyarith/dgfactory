const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

type Story = {
  id: string;
  title: string;
  priority: number;
  description: string;
  acceptanceCriteria: string[];
  filesLikelyTouched: string[];
  testCommands: string[];
  passes: boolean;
  notes: string;
};

type Prd = {
  project: string;
  branchName: string;
  stories: Story[];
};

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- None listed";
}

const root = process.cwd();
const prdPath = resolve(root, "tasks", "prd.json");
const outputDir = resolve(root, "tasks", "generated-issues");
const prd = JSON.parse(readFileSync(prdPath, "utf8")) as Prd;

mkdirSync(outputDir, { recursive: true });

prd.stories.forEach((story) => {
  const body = [
    `# ${story.title}`,
    "",
    `Project: ${prd.project}`,
    `Story ID: ${story.id}`,
    `Priority: ${story.priority}`,
    `Status: ${story.passes ? "Passing" : "Pending"}`,
    "",
    "## Description",
    "",
    story.description,
    "",
    "## Acceptance Criteria",
    "",
    list(story.acceptanceCriteria),
    "",
    "## Files Likely Touched",
    "",
    list(story.filesLikelyTouched),
    "",
    "## Test Commands",
    "",
    list(story.testCommands),
    "",
    "## Safety",
    "",
    "- Do not deploy automatically.",
    "- Do not run production database migrations automatically.",
    "- Do not send external messages.",
    "- Do not commit secrets.",
    "- Human review required before merge.",
    "",
    "## Notes",
    "",
    story.notes || "None",
    "",
  ].join("\n");
  const filename = `${story.id}-${slug(story.title)}.md`;

  writeFileSync(resolve(outputDir, filename), body, "utf8");
  console.log(`Generated tasks/generated-issues/${filename}`);
});

if (!prd.stories.length) {
  console.log("No stories found in tasks/prd.json. No issue files generated.");
}
