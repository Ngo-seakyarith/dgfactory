export const slideDeckLayouts = [
  "section",
  "statement",
  "bullets",
  "numbered",
  "two-column",
  "practice",
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

export const slideDeckGenerationRules = [
  "Do not return cover or agenda slides; the exporter creates them. Return version 2, the course title, and the number of body slides needed for the supplied duration and scope, up to 30 slides.",
  "Choose one supported layout for every slide: section, statement, bullets, numbered, two-column, practice, icon-cards, process, cycle, comparison, matrix, timeline, funnel, chart, or closing.",
  "Follow the supplied course topic, audience, objectives, outcomes, priorities, and context. The subject may be soft skills, leadership, sales, finance, operations, AI, or another training area. Never default to AI or introduce a subject that was not requested.",
  "Develop complete, trainer-ready material rather than a thin outline. Decide the teaching sequence, frameworks, explanations, examples, activities, and depth that best fit the supplied course. Do not shorten useful content merely to reduce the slide count; use additional focused slides when needed.",
  "Layout capacity limits: section supports an introduction of up to 60 words plus up to 4 focus points and should be used no more than three times; statement supports one developed message of up to 100 words; bullets supports an introduction of up to 45 words plus up to 7 detailed points of up to 35 words each; numbered supports an introduction of up to 40 words plus up to 7 sequential steps of up to 35 words each; two-column supports an introduction of up to 40 words, short left and right titles, and up to 4 items of up to 30 words per side; practice supports an introduction of up to 45 words plus up to 7 numbered instructions; closing supports one synthesis of up to 100 words.",
  "Use visual layouts whenever a diagram communicates the teaching point more clearly than bullets. Across a normal deck, aim for a varied mix rather than repeating one silhouette: icon-cards for 3-4 parallel concepts; process for 3-5 sequential stages; cycle for 3-5 repeating stages; comparison for two clearly named sides with up to 4 items each; matrix for exactly 4 quadrants and clear horizontal and vertical axis labels; timeline for 3-6 chronological milestones; funnel for 3-5 narrowing stages; chart for 3-7 supplied numeric values.",
  "For icon-cards, process, cycle, matrix, timeline, funnel, and chart, fill visualItems. Each visual item needs an icon from target, idea, people, chart, shield, check, clock, message, business, settings, star, or learning; a concise label; a short description; and a numeric value. Use value 0 unless the chart layout needs an evidence-based value.",
  "For comparison, fill leftTitle, leftItems, rightTitle, and rightItems. For cycle, visualCenter may name the shared outcome. For matrix, fill visualXAxis and visualYAxis and order visualItems as upper-left, upper-right, lower-left, then lower-right. For chart, fill visualUnit and visualSource, and use chart only when the supplied material contains real numeric data; never invent measurements, percentages, benchmarks, or results.",
  "Use intro only for section, bullets, numbered, two-column, and practice layouts. Use statement only for statement and closing layouts.",
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

function cleanItems(value: unknown, maximum: number) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, 260))
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
    layout === "two-column" ? 0 : layout === "section" ? 4 : 7,
  );
  const comparisonLayout = layout === "two-column" || layout === "comparison";
  const leftItems = cleanItems(input.leftItems, comparisonLayout ? 4 : 0);
  const rightItems = cleanItems(input.rightItems, comparisonLayout ? 4 : 0);
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
      ["section", "bullets", "numbered", "two-column", "practice"].includes(
        layout,
      )
        ? intro
        : "",
    statement:
      layout === "statement" || layout === "closing" ? statement : "",
    bullets,
    leftTitle: layout === "two-column" || layout === "comparison"
      ? cleanText(input.leftTitle, 60)
      : "",
    leftItems: layout === "two-column" || layout === "comparison" ? leftItems : [],
    rightTitle: layout === "two-column" || layout === "comparison"
      ? cleanText(input.rightTitle, 60)
      : "",
    rightItems: layout === "two-column" || layout === "comparison" ? rightItems : [],
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
        .slice(0, 30)
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
  } else if (slide.layout === "two-column" || slide.layout === "comparison") {
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
