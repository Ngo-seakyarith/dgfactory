export const dgProposalTemplateGuide = [
  "Follow the DG Academy client proposal family shown by the Nippon Paint and LOLC references. Do not force one fixed page count.",
  "Proposal length is driven by the completed brief. Keep every section useful, concise, and proportionate to its source content.",
  "1. Course Overview: write three short paragraphs explaining the client context, the practical training goal, and the expected business value.",
  "2. Course Objectives: write concise bullets describing what participants will understand, identify, analyze, build, communicate, handle, or apply.",
  "3. Expected Learning Outcomes: use the supplied expectedLearningOutcomes as the authority and return a complete, concrete list.",
  "4. Content Outlines: use proposalBrief.contentPriorities as the authority. Preserve the user's structure when they provide session plans, numbered topic lists, or mixed topic lists with sub-items.",
  "5. Who Should Attend: derive the participant groups from the supplied audience and return them as concise bullets.",
  "6. Training Methodology: provide concise bullets for theory/practice balance, focused inputs, live demonstrations, exercises, group sharing, local context, and follow-up when relevant.",
  "7. Training and Coaching Tools: use the supplied training tools and materials as the authority.",
  "8. Training Evaluation: use the supplied evaluation approach as the authority.",
  "Treat the user brief as authoritative. Convert line-separated outcomes, topics, tools, and section content into clean arrays.",
  "Return only proposalNarrative. Do not return cover metadata, course identity, client identity, schedule, trainer profiles, commercial terms, pricing, acceptance wording, or signatory data. Application code owns and inserts those fields deterministically.",
].join("\n");
