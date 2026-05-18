export type BrainModelStatus = "configured" | "error";

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
    modelStatus: "error",
    lastWarning: null,
    lastError: null,
  });

export const intendedBrainModel =
  process.env.AI_BRAIN_MODEL?.trim() || "gpt-5.5";

export function isBrainApiKeyConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function actualModelUsed() {
  return runtimeState.lastSuccessfulModelUsed ?? intendedBrainModel;
}

export function recordBrainModelSuccess(model: string) {
  runtimeState.lastSuccessfulModelUsed = model;
  runtimeState.modelStatus = "configured";
  runtimeState.lastWarning = null;
  runtimeState.lastError = null;
}

export function recordBrainModelError(error: unknown) {
  runtimeState.modelStatus = "error";
  runtimeState.lastError = error instanceof Error ? error.message : String(error);
}

export function getBrainModelStatus() {
  return {
    intendedBrainModel,
    actualModelUsed: actualModelUsed(),
    apiKeyConfigured: isBrainApiKeyConfigured(),
    lastSuccessfulModelUsed: runtimeState.lastSuccessfulModelUsed,
    modelStatus: runtimeState.modelStatus,
    lastWarning: runtimeState.lastWarning,
    lastError: runtimeState.lastError,
  };
}
