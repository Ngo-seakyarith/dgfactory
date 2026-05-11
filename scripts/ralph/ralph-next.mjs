import {
  formatStoryPrompt,
  getNextStory,
  printSafetyRules,
  readPrd,
  safeBranchName,
} from "./ralph-utils.mjs";

try {
  const prd = readPrd();
  const story = getNextStory(prd);

  if (!story) {
    console.log("No pending stories. Nothing to hand to Codex.");
    process.exit(0);
  }

  const branch = `codex/${safeBranchName(`${prd.branchName}-${story.id}`)}`;
  const prompt = formatStoryPrompt(prd, story);
  const encodedPrompt = JSON.stringify(prompt);

  console.log(`Next story: ${story.id} - ${story.title}`);
  console.log("");
  console.log("Recommended branch commands:");
  console.log(`git switch ${branch} || git switch -c ${branch}`);
  console.log("");
  console.log("Codex command to run manually:");
  console.log(`codex ${encodedPrompt}`);
  console.log("");
  console.log("Quality commands before marking the story as passed:");
  const commands = story.testCommands.length
    ? story.testCommands
    : ["npm run lint", "npm run typecheck", "npm test", "npm run build"];
  commands.forEach((command) => console.log(`- ${command}`));
  console.log("");
  console.log("After checks pass:");
  console.log(`- Update tasks/prd.json so ${story.id}.passes=true`);
  console.log("- Append concise learnings to tasks/progress.txt");
  console.log("- Commit only the one-story changes after reviewing secrets and docs");
  console.log("");
  printSafetyRules();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
