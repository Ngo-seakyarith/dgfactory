import OpenAI from "openai";

let openRouterClient: OpenAI | null = null;

export function getOpenRouterClient() {
  if (!process.env.OPENROUTER_API_KEY) {
    return null;
  }

  if (!openRouterClient) {
    openRouterClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-OpenRouter-Title": "DG Academy Training Production Factory",
      },
    });
  }

  return openRouterClient;
}
