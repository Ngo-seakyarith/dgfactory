export type BrainModelStatus = "configured" | "fallback" | "mock" | "error";

type ModelRuntimeState = {
  lastSuccessfulModelUsed: string | null;
  modelStatus: BrainModelStatus;
  lastWarning: string | null;
  lastError: string | null;
};

const globalForModelState = globalThis as typeof globalThis & {
  __dgBrainModelState?: ModelRuntimeState;
};

const runtimeState =
  globalForModelState.__dgBrainModelState ??
  (globalForModelState.__dgBrainModelState = {
    lastSuccessfulModelUsed: null,
    modelStatus: "mock",
    lastWarning: null,
    lastError: null,
  });

export const intendedBrainModel =
  process.env.AI_BRAIN_MODEL?.trim() || "gpt-5.5";

export const fallbackModel =
  process.env.OPENAI_MODEL?.trim() &&
  process.env.OPENAI_MODEL.trim() !== intendedBrainModel
    ? process.env.OPENAI_MODEL.trim()
    : "gpt-4o-mini";

export function isBrainApiKeyConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function actualModelUsed() {
  if (!isBrainApiKeyConfigured()) {
    return "mock";
  }

  return runtimeState.lastSuccessfulModelUsed ?? intendedBrainModel;
}

export function recordBrainModelSuccess(model: string) {
  runtimeState.lastSuccessfulModelUsed = model;
  runtimeState.modelStatus = model === intendedBrainModel ? "configured" : "fallback";
  runtimeState.lastError = null;
}

export function recordBrainModelFallback({
  intendedModel,
  nextModel,
  reason,
}: {
  intendedModel: string;
  nextModel: string;
  reason: string;
}) {
  const warning = `[brain] AI_BRAIN_MODEL=${intendedModel} unavailable. Falling back to ${nextModel}. ${reason}`;
  runtimeState.modelStatus = "fallback";
  runtimeState.lastWarning = warning;
  console.warn(warning);
}

export function recordBrainModelMock(reason: string) {
  runtimeState.modelStatus = "mock";
  runtimeState.lastWarning = reason;
}

export function recordBrainModelError(error: unknown) {
  runtimeState.modelStatus = "error";
  runtimeState.lastError = error instanceof Error ? error.message : String(error);
}

export function getBrainModelStatus() {
  const mockMode = !isBrainApiKeyConfigured() || runtimeState.modelStatus === "mock";

  return {
    intendedBrainModel,
    fallbackModel,
    actualModelUsed: actualModelUsed(),
    mockMode,
    apiKeyConfigured: isBrainApiKeyConfigured(),
    lastSuccessfulModelUsed: runtimeState.lastSuccessfulModelUsed,
    modelStatus: mockMode ? ("mock" as const) : runtimeState.modelStatus,
    lastWarning: runtimeState.lastWarning,
    lastError: runtimeState.lastError,
  };
}
