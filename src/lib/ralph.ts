import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  improvementToRalphStory,
  type ImprovementOpportunity,
  type RalphStory,
} from "@/lib/improvements";

export type RalphPrd = {
  project: string;
  branchName: string;
  stories: RalphStory[];
};

const projectRoot = process.cwd();
const prdPath = path.join(projectRoot, "tasks", "prd.json");
const progressPath = path.join(projectRoot, "tasks", "progress.txt");

function fallbackPrd(): RalphPrd {
  return {
    project: "DG Academy Capability Factory",
    branchName: "agentic-capability-factory",
    stories: [],
  };
}

export async function readRalphPrd() {
  try {
    const content = await readFile(prdPath, "utf8");
    const parsed = JSON.parse(content) as Partial<RalphPrd>;

    return {
      prd: {
        project: parsed.project || fallbackPrd().project,
        branchName: parsed.branchName || fallbackPrd().branchName,
        stories: Array.isArray(parsed.stories) ? parsed.stories : [],
      },
      accessible: true,
      path: prdPath,
    };
  } catch {
    return {
      prd: fallbackPrd(),
      accessible: false,
      path: prdPath,
    };
  }
}

export async function readRalphProgress() {
  try {
    const content = await readFile(progressPath, "utf8");
    return {
      content,
      latestNotes: content.split(/\r?\n/).filter(Boolean).slice(-12),
      accessible: true,
      path: progressPath,
    };
  } catch {
    return {
      content: "",
      latestNotes: [],
      accessible: false,
      path: progressPath,
    };
  }
}

export async function appendImprovementToPrd(opportunity: ImprovementOpportunity) {
  const story = improvementToRalphStory(opportunity);
  const { prd, accessible } = await readRalphPrd();
  const nextPrd: RalphPrd = {
    ...prd,
    stories: [
      ...prd.stories.filter((item) => item.id !== story.id),
      story,
    ].sort((a, b) => a.priority - b.priority),
  };
  const content = `${JSON.stringify(nextPrd, null, 2)}\n`;

  if (!accessible) {
    return {
      story,
      prd: nextPrd,
      written: false,
      storyContent: JSON.stringify(story, null, 2),
      message:
        "tasks/prd.json is not writable in this environment. Use the returned story content manually.",
    };
  }

  try {
    await writeFile(prdPath, content, "utf8");
    return {
      story,
      prd: nextPrd,
      written: true,
      storyContent: JSON.stringify(story, null, 2),
      message: "Story appended to tasks/prd.json.",
    };
  } catch {
    return {
      story,
      prd: nextPrd,
      written: false,
      storyContent: JSON.stringify(story, null, 2),
      message:
        "tasks/prd.json could not be written. Use the returned story content manually.",
    };
  }
}

export function summarizeRalphPrd(prd: RalphPrd) {
  const pendingStories = prd.stories.filter((story) => !story.passes);
  const completedStories = prd.stories.filter((story) => story.passes);

  return {
    pendingStories,
    completedStories,
    suggestedNextStory:
      pendingStories.sort((a, b) => a.priority - b.priority)[0] ?? null,
  };
}
