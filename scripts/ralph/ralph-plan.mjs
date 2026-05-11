import {
  getNextStory,
  printSafetyRules,
  readPrd,
  safeBranchName,
} from "./ralph-utils.mjs";

try {
  const prd = readPrd();
  const nextStory = getNextStory(prd);
  const total = prd.stories.length;
  const passing = prd.stories.filter((story) => story.passes).length;

  console.log(`Project: ${prd.project}`);
  console.log(`Stories: ${passing}/${total} passing`);
  console.log(`Base feature branch: codex/${safeBranchName(prd.branchName)}`);
  console.log("");

  if (!nextStory) {
    console.log("No pending stories. Ralph loop has nothing to do.");
  } else {
    console.log("Next story:");
    console.log(`- ${nextStory.id}: ${nextStory.title}`);
    console.log(`- Priority: ${nextStory.priority}`);
    console.log(`- Description: ${nextStory.description}`);
  }

  console.log("");
  printSafetyRules();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
