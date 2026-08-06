export const toolLogoCatalog = {
  openai: {
    name: "ChatGPT / OpenAI",
    provider: "OpenAI",
    source: "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/openai.svg",
    informationSource: "https://help.openai.com/en/articles/12677804-what-is-chatgpt-faq",
    description: "General-purpose conversational AI assistant for writing, learning, planning, coding, and file or image analysis.",
    knownFor: "Broad everyday task coverage with web search, data analysis, image, and voice capabilities.",
    aliases: ["chatgpt", "openai", "gpt"],
  },
  claude: {
    name: "Claude",
    provider: "Anthropic",
    source: "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/claude-color.svg",
    informationSource: "https://www.anthropic.com/pricing?subjects=claude&type=product",
    description: "Anthropic AI assistant for writing, content creation, code generation, and analysis of text and images.",
    knownFor: "Document-heavy analysis and writing, coding workflows, research, and extended thinking for complex work.",
    aliases: ["claude", "anthropic"],
  },
  gemini: {
    name: "Gemini",
    provider: "Google",
    source: "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/gemini-color.svg",
    informationSource: "https://ai.google.dev/gemini-api/docs/models",
    description: "Google multimodal AI model family that works with text, images, audio, video, and PDF inputs.",
    knownFor: "Multimodal understanding, complex reasoning and coding, with models optimized for different speed and cost needs.",
    aliases: ["gemini", "google ai"],
  },
  grok: {
    name: "Grok",
    provider: "xAI",
    source: "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/grok.svg",
    informationSource: "https://x.ai/news/grok-1212",
    description: "xAI conversational assistant available through X and Grok, with web and X search capabilities.",
    knownFor: "Timely information from X and the wider web, source citations, and image generation.",
    aliases: ["grok", "xai", "x ai"],
  },
  deepseek: {
    name: "DeepSeek",
    provider: "DeepSeek",
    source: "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/deepseek-color.svg",
    informationSource: "https://api-docs.deepseek.com/news/news250120/",
    description: "AI model family offering chat and reasoning modes through hosted services and openly released model weights.",
    knownFor: "Step-by-step reasoning, mathematics, coding, and open model releases.",
    aliases: ["deepseek", "deep seek"],
  },
  qwen: {
    name: "Qwen",
    provider: "Alibaba Cloud",
    source: "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/qwen-color.svg",
    informationSource: "https://qwenlm.github.io/blog/qwen3/",
    description: "Alibaba multilingual model family with language, vision, audio, coding, and mathematics variants.",
    knownFor: "Broad multilingual coverage, open model releases, and multimodal and agentic capabilities.",
    aliases: ["qwen", "tongyi"],
  },
  perplexity: {
    name: "Perplexity",
    provider: "Perplexity AI",
    source: "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/perplexity-color.svg",
    informationSource: "https://www.perplexity.ai/help-center/en/articles/10352155-what-is-perplexity",
    description: "AI-powered search engine that searches the web and synthesizes conversational answers.",
    knownFor: "Current web research with citations and direct links to original sources.",
    aliases: ["perplexity"],
  },
  copilot: {
    name: "Copilot",
    provider: "Microsoft",
    source: "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/copilot-color.svg",
    informationSource: "https://learn.microsoft.com/en-us/copilot/overview",
    description: "Microsoft AI assistant family for web-grounded chat and work within Microsoft productivity products.",
    knownFor: "Microsoft 365 workflow integration; organizational grounding depends on the Copilot product and license.",
    aliases: ["copilot", "microsoft copilot", "github copilot"],
  },
  replit: {
    name: "Replit",
    provider: "Replit",
    source: "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/replit-color.svg",
    informationSource: "https://docs.replit.com/build/your-first-app",
    description: "Browser-based software platform with an AI Agent that can create, modify, test, and publish applications.",
    knownFor: "Turning natural-language app ideas into working, cloud-hosted prototypes and deployments.",
    aliases: ["replit"],
  },
} as const;

export type ToolLogoKey = keyof typeof toolLogoCatalog;

export type LoadedToolLogo = {
  data: string;
  name: string;
  source: string;
};

export type LoadedToolLogos = Partial<Record<ToolLogoKey, LoadedToolLogo>>;

export const toolLogoCatalogNames = Object.values(toolLogoCatalog).map(
  (entry) => entry.name,
);

function normalizedToolName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeSvgForPowerPoint(svg: string) {
  return svg.replace(/<svg\b([^>]*)>/i, (_match, attributes: string) => {
    const normalizedAttributes = attributes
      .replace(/\s(?:width|height|style)=("[^"]*"|'[^']*')/gi, "")
      .trim();
    return `<svg${normalizedAttributes ? ` ${normalizedAttributes}` : ""} width="128" height="128">`;
  });
}

export function resolveToolLogoKey(label: string): ToolLogoKey | null {
  const normalized = normalizedToolName(label);
  if (!normalized) return null;

  for (const [key, entry] of Object.entries(toolLogoCatalog)) {
    if (
      entry.aliases.some((alias) => {
        const normalizedAlias = normalizedToolName(alias);
        return normalized === normalizedAlias ||
          normalized.startsWith(`${normalizedAlias} `) ||
          normalized.endsWith(` ${normalizedAlias}`);
      })
    ) {
      return key as ToolLogoKey;
    }
  }

  return null;
}

export async function loadToolLogos(labels: string[]): Promise<LoadedToolLogos> {
  const keys = Array.from(
    new Set(labels.map(resolveToolLogoKey).filter((key): key is ToolLogoKey => Boolean(key))),
  );
  const loaded = await Promise.all(
    keys.map(async (key) => {
      const entry = toolLogoCatalog[key];
      try {
        const response = await fetch(entry.source, {
          headers: { Accept: "image/svg+xml" },
          signal: AbortSignal.timeout(5_000),
        });
        if (!response.ok) return null;
        const svg = await response.text();
        if (!/^\s*<svg[\s>]/i.test(svg)) return null;
        const normalizedSvg = normalizeSvgForPowerPoint(svg);
        return [
          key,
          {
            data: `data:image/svg+xml;base64,${Buffer.from(normalizedSvg).toString("base64")}`,
            name: entry.name,
            source: entry.source,
          },
        ] as const;
      } catch {
        return null;
      }
    }),
  );

  return Object.fromEntries(
    loaded.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
  );
}
