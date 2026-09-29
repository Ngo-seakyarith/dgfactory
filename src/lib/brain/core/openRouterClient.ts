import { OpenRouter } from "@openrouter/sdk";

let openRouterClient: OpenRouter | null = null;

export function getOpenRouterClient() {
  if (!process.env.OPENROUTER_API_KEY) {
    return null;
  }

  if (!openRouterClient) {
    openRouterClient = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
      httpReferer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      appTitle: "DG Academy Training Production Factory",
      timeoutMs: 10 * 60 * 1000,
      // The generation layer owns retries so every attempt is recorded.
      retryConfig: { strategy: "none" },
    });
  }

  return openRouterClient;
}
