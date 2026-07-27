export const dgProposalTemplateGuide = [
  "Follow the DG Academy client proposal family shown by the Nippon Paint and LOLC references. Do not force one fixed page count.",
  "Proposal length is driven by the fields the user fills. Required core fields create the short proposal. Optional fields add their own sections only when useful content is supplied.",
  "1. Course Overview: write three short paragraphs explaining the client context, the practical training goal, and the expected business value.",
  "2. Course Objectives: write concise bullets describing what participants will understand, identify, analyze, build, communicate, handle, or apply.",
  "3. Expected Learning Outcomes: use the supplied expectedLearningOutcomes when present; otherwise return an empty array.",
  "4. Content Outlines: use proposalBrief.contentPriorities as the authority. Preserve the user's structure when they provide session plans, numbered topic lists, or mixed topic lists with sub-items.",
  "5. Who Should Attend: use the supplied field when present; otherwise return an empty array.",
  "6. Training Methodology: provide concise bullets for theory/practice balance, focused inputs, live demonstrations, exercises, group sharing, local context, and follow-up when relevant.",
  "7. Training and Coaching Tools: use the supplied tools when present; otherwise return an empty array.",
  "8. Training Evaluation: use the supplied evaluation approach when present; otherwise return an empty array.",
  "Treat the user brief as authoritative. Convert line-separated objectives, topics, tools, and optional section content into clean arrays.",
  "Return only proposalNarrative. Do not return cover metadata, course identity, client identity, schedule, trainer profiles, commercial terms, pricing, acceptance wording, or signatory data. Application code owns and inserts those fields deterministically.",
].join("\n");
