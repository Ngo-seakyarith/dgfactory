export const slideDeckLayouts = [
  "section",
  "statement",
  "bullets",
  "numbered",
  "two-column",
  "demo",
  "practice",
  "case-lab",
  "icon-cards",
  "process",
  "cycle",
  "comparison",
  "matrix",
  "timeline",
  "funnel",
  "chart",
  "closing",
] as const;

export type SlideDeckLayout = (typeof slideDeckLayouts)[number];

export const slideDeckIconKeys = [
  "target",
  "idea",
  "people",
  "chart",
  "shield",
  "check",
  "clock",
  "message",
  "business",
  "settings",
  "star",
  "learning",
] as const;

export type SlideDeckIconKey = (typeof slideDeckIconKeys)[number];

export type SlideDeckVisualItem = {
  icon: SlideDeckIconKey;
  label: string;
  description: string;
  value: number;
};

export type SlideDeckSlide = {
  layout: SlideDeckLayout;
  title: string;
  intro: string;
  statement: string;
  bullets: string[];
  leftTitle: string;
  leftItems: string[];
  rightTitle: string;
  rightItems: string[];
  visualItems: SlideDeckVisualItem[];
  visualCenter: string;
  visualXAxis: string;
  visualYAxis: string;
  visualUnit: string;
  visualSource: string;
  speakerNotes: string;
};

export type SlideDeckPlan = {
  version: 2;
  title: string;
  slides: SlideDeckSlide[];
};

export type SlideDeckBrainOutput = {
  deck: SlideDeckPlan;
};

export type SlideDeckLengthGuidance = {
  targetTotalSlides: number;
  targetBodySlides: number;
  minimumBodySlides: number;
  maximumBodySlides: number;
};

export function slideDeckLengthGuidance(
  duration: string,
): SlideDeckLengthGuidance | null {
  const normalizedDuration = duration.trim().toLowerCase().replace(/[_\s]+/g, "-");

  if (["half-day", "halfday"].includes(normalizedDuration)) {
    return {
      targetTotalSlides: 30,
      targetBodySlides: 28,
      minimumBodySlides: 26,
      maximumBodySlides: 30,
    };
  }

  if (["full-day", "fullday", "1-day", "one-day"].includes(normalizedDuration)) {
    return {
      targetTotalSlides: 50,
      targetBodySlides: 48,
      minimumBodySlides: 45,
      maximumBodySlides: 51,
    };
  }

  return null;
}

export const slideDeckGenerationRules = [
  "Do not return cover or agenda slides; the exporter creates them. Return version 2, the course title, and enough body slides to teach and practise the supplied duration and scope, up to 60 body slides.",
  "Choose one supported layout for every slide: section, statement, bullets, numbered, two-column, demo, practice, case-lab, icon-cards, process, cycle, comparison, matrix, timeline, funnel, chart, or closing.",
  "Follow the supplied course topic, audience, objectives, outcomes, priorities, and context. The subject may be soft skills, leadership, sales, finance, operations, AI, or another training area. Never default to AI or introduce a subject that was not requested.",
  "Develop complete, trainer-ready material rather than a thin outline. Decide the teaching sequence, frameworks, explanations, examples, activities, and depth that best fit the supplied course. Do not shorten useful content merely to reduce the slide count; use additional focused slides when needed.",
  "Use section slides to introduce the major modules found in the supplied syllabus or course content. Let that source determine module names, objectives, and teaching sequence.",
  "A demo is a live trainer demonstration, not a description of one. Use intro for the scenario and purpose; leftTitle and leftItems for the realistic input, script, case, prompt, calculation, worked example, or source material; rightTitle and rightItems for the trainer actions, expected observable result, and verification checks. Use 1-4 items per side and make the slide runnable without hidden information.",
  "Adapt demonstrations to the requested subject. Suitable formats include role-play, worked calculation, live critique, workflow walkthrough, case analysis, decision demonstration, or tool demonstration. Never default to an AI prompt when the course is about another subject.",
  "Do not assume access to software, files, equipment, policies, client data, or numeric results that were not supplied. When no special resource is confirmed, design a low-resource demonstration using a realistic scenario or worked example and clearly label assumptions.",
  "Pair every demonstration with related participant practice within the next two slides. Practice bullets must begin with 'Time:' and include clear instructions plus separate final bullets beginning with 'Deliverable:', 'Success criteria:', and 'Debrief:'. The deliverable must be observable and the debrief must include a quality, verification, or reflection check.",
  "After guided demo-practice blocks, use case-lab for a realistic integrated business problem. Put the full scenario in intro, evidence or source material in leftItems, and the participant task, required outputs, risks, and review criteria in rightItems. Include rightItems beginning with 'Deliverable:' and 'Review:'. Clearly label invented examples as synthetic or illustrative.",
  "At least 35 percent of non-section body slides must be demo, practice, or case-lab, and decks of 18 or more body slides should include a case-lab.",
  "When an existing concept slide needs to introduce named AI products, use icon-cards with 2-4 exact product names as visualItems labels. Available branded examples are ChatGPT / OpenAI, Claude, Gemini, Grok, DeepSeek, Qwen, Perplexity, Copilot, and Replit. The exporter supplies their official logos and researched product facts. Include only tools relevant to the lesson, split a longer list across the surrounding lesson where needed, and never recommend one without supplied client requirements and evidence.",
  "Layout capacity limits: section supports an introduction of up to 60 words plus up to 4 focus points; statement supports one developed message of up to 100 words; bullets supports an introduction of up to 45 words plus up to 7 detailed points of up to 35 words each; numbered supports an introduction of up to 40 words plus up to 7 sequential steps of up to 35 words each; two-column supports an introduction of up to 40 words, short left and right titles, and up to 4 items of up to 30 words per side; demo and case-lab support an introduction of up to 40 words and up to 4 items per side, including one detailed source item of up to 80 words; practice supports an introduction of up to 45 words plus 4-7 numbered instructions; closing supports one synthesis of up to 100 words.",
  "Use visual layouts whenever a diagram communicates the teaching point more clearly than bullets. Across a normal deck, aim for a varied mix rather than repeating one silhouette: icon-cards for 3-4 parallel concepts; process for 3-5 sequential stages; cycle for 3-5 repeating stages; comparison for two clearly named sides with up to 4 items each; matrix for exactly 4 quadrants and clear horizontal and vertical axis labels; timeline for 3-6 chronological milestones; funnel for 3-5 narrowing stages; chart for 3-7 supplied numeric values.",
  "For icon-cards, process, cycle, matrix, timeline, funnel, and chart, fill visualItems. Each visual item needs an icon from target, idea, people, chart, shield, check, clock, message, business, settings, star, or learning; a concise label; a short description; and a numeric value. Use value 0 unless the chart layout needs an evidence-based value.",
  "For comparison, fill leftTitle, leftItems, rightTitle, and rightItems. For cycle, visualCenter may name the shared outcome. For matrix, fill visualXAxis and visualYAxis and order visualItems as upper-left, upper-right, lower-left, then lower-right. For chart, fill visualUnit and visualSource, and use chart only when the supplied material contains real numeric data; never invent measurements, percentages, benchmarks, or results.",
  "Use intro only for section, bullets, numbered, two-column, demo, and practice layouts. Use statement only for statement and closing layouts.",
  "Populate every schema field. Use empty strings, empty arrays, or numeric 0 for fields the chosen layout does not use, and never place content in unsupported fields.",
  "Keep each slide focused on one idea and use the available layout space well. Split a complex topic across multiple complete slides instead of producing title-only slides, fragmentary content, or an overflowing slide.",
  "Add one to three concise sentences of speaker notes to every slide. Notes may explain, transition, ask a question, or debrief, but essential participant-facing content must remain on the slide.",
] as const;

const PLAN_MARKER = "dg-slide-deck:";

function cleanText(value: unknown, maxLength = 800) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanItems(value: unknown, maximum: number, maxLength = 260) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, maximum);
}

function isSlideDeckLayout(value: unknown): value is SlideDeckLayout {
  return (
    typeof value === "string" &&
    slideDeckLayouts.includes(value as SlideDeckLayout)
  );
}

function isSlideDeckIconKey(value: unknown): value is SlideDeckIconKey {
  return (
    typeof value === "string" &&
    slideDeckIconKeys.includes(value as SlideDeckIconKey)
  );
}

function cleanVisualItems(value: unknown, maximum: number) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index): SlideDeckVisualItem | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const input = item as Partial<SlideDeckVisualItem>;
      const label = cleanText(input.label, 72);
      if (!label) return null;

      return {
        icon: isSlideDeckIconKey(input.icon)
          ? input.icon
          : slideDeckIconKeys[index % slideDeckIconKeys.length],
        label,
        description: cleanText(input.description, 180),
        value: typeof input.value === "number" && Number.isFinite(input.value)
          ? input.value
          : 0,
      };
    })
    .filter((item): item is SlideDeckVisualItem => Boolean(item))
    .slice(0, maximum);
}

function visualItemLimit(layout: SlideDeckLayout) {
  if (layout === "icon-cards" || layout === "matrix") return 4;
  if (layout === "process" || layout === "cycle" || layout === "funnel") return 5;
  if (layout === "timeline") return 6;
  if (layout === "chart") return 7;
  return 0;
}

function normalizeSlide(value: unknown, index: number): SlideDeckSlide | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Partial<SlideDeckSlide>;
  let layout = isSlideDeckLayout(input.layout) ? input.layout : "bullets";
  const title = cleanText(input.title, 120) || `Slide ${index + 1}`;
  const intro = cleanText(input.intro, 420);
  const statement = cleanText(input.statement, 900);
  const bullets = cleanItems(
    input.bullets,
    layout === "two-column" || layout === "demo" || layout === "case-lab"
      ? 0
      : layout === "section"
        ? 4
        : 7,
  );
  const comparisonLayout = ["two-column", "comparison", "demo", "case-lab"].includes(layout);
  const itemLength = layout === "demo" || layout === "case-lab" ? 520 : 260;
  const leftItems = cleanItems(input.leftItems, comparisonLayout ? 4 : 0, itemLength);
  const rightItems = cleanItems(input.rightItems, comparisonLayout ? 4 : 0, itemLength);
  const visualItems = cleanVisualItems(input.visualItems, visualItemLimit(layout));

  if (
    ["icon-cards", "process", "cycle", "matrix", "timeline", "funnel", "chart"].includes(layout) &&
    visualItems.length === 0
  ) {
    layout = "bullets";
  }

  if (layout === "comparison" && (!leftItems.length || !rightItems.length)) {
    layout = "two-column";
  }

  return {
    layout,
    title,
    intro:
      ["section", "bullets", "numbered", "two-column", "demo", "practice", "case-lab"].includes(
        layout,
      )
        ? intro
        : "",
    statement:
      layout === "statement" || layout === "closing" ? statement : "",
    bullets,
    leftTitle: comparisonLayout
      ? cleanText(input.leftTitle, 60)
      : "",
    leftItems: comparisonLayout ? leftItems : [],
    rightTitle: comparisonLayout
      ? cleanText(input.rightTitle, 60)
      : "",
    rightItems: comparisonLayout ? rightItems : [],
    visualItems,
    visualCenter: layout === "cycle" ? cleanText(input.visualCenter, 70) : "",
    visualXAxis: layout === "matrix" ? cleanText(input.visualXAxis, 70) : "",
    visualYAxis: layout === "matrix" ? cleanText(input.visualYAxis, 70) : "",
    visualUnit: layout === "chart" ? cleanText(input.visualUnit, 40) : "",
    visualSource: layout === "chart" ? cleanText(input.visualSource, 140) : "",
    speakerNotes: cleanText(input.speakerNotes, 900),
  };
}

export function normalizeSlideDeckPlan(value: unknown): SlideDeckPlan {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<SlideDeckPlan>
    : {};
  const slides = Array.isArray(input.slides)
    ? input.slides
        .map(normalizeSlide)
        .filter((slide): slide is SlideDeckSlide => Boolean(slide))
    .slice(0, 60)
    : [];

  return {
    version: 2,
    title: cleanText(input.title, 140) || "DG Academy Training",
    slides,
  };
}

function slideMarkdown(slide: SlideDeckSlide, index: number) {
  const lines = [`## ${String(index + 1).padStart(2, "0")}. ${slide.title}`];

  if (slide.intro) lines.push("", slide.intro);

  if (slide.layout === "statement" || slide.layout === "closing") {
    if (slide.statement) lines.push("", slide.statement);
  } else if (["two-column", "comparison", "demo", "case-lab"].includes(slide.layout)) {
    if (slide.leftTitle) lines.push("", `### ${slide.leftTitle}`);
    slide.leftItems.forEach((item) => lines.push(`- ${item}`));
    if (slide.rightTitle) lines.push("", `### ${slide.rightTitle}`);
    slide.rightItems.forEach((item) => lines.push(`- ${item}`));
  } else if (slide.layout === "numbered" || slide.layout === "practice") {
    slide.bullets.forEach((item, itemIndex) =>
      lines.push(`${itemIndex + 1}. ${item}`)
    );
  } else if (slide.layout === "bullets" || slide.layout === "section") {
    slide.bullets.forEach((item) => lines.push(`- ${item}`));
  } else if (slide.visualItems.length) {
    slide.visualItems.forEach((item) => {
      const value = slide.layout === "chart"
        ? `: ${item.value}${slide.visualUnit ? ` ${slide.visualUnit}` : ""}`
        : "";
      lines.push(`- **${item.label}${value}**${item.description ? ` - ${item.description}` : ""}`);
    });
    if (slide.visualSource) lines.push("", `Source: ${slide.visualSource}`);
  }

  return lines.join("\n");
}

export function serializeSlideDeckPlan(value: unknown) {
  const plan = normalizeSlideDeckPlan(value);
  const encoded = encodeURIComponent(JSON.stringify(plan));
  const readable = plan.slides.map(slideMarkdown).join("\n\n");
  return `<!-- ${PLAN_MARKER}${encoded} -->\n\n# ${plan.title}\n\n${readable}`.trim();
}

export function parseSlideDeckPlan(value: string): SlideDeckPlan | null {
  const firstLine = value.split(/\r?\n/, 1)[0]?.trim() ?? "";
  const prefix = `<!-- ${PLAN_MARKER}`;
  if (!firstLine.startsWith(prefix) || !firstLine.endsWith(" -->")) return null;

  try {
    const encoded = firstLine.slice(prefix.length, -4);
    const parsed = JSON.parse(decodeURIComponent(encoded)) as unknown;
    const plan = normalizeSlideDeckPlan(parsed);
    return plan.slides.length ? plan : null;
  } catch {
    return null;
  }
}
