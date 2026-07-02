type ModelRuntimeState = {
  lastError: string | null;
};

const globalForModelState = globalThis as typeof globalThis & {
  __dgBrainModelState?: ModelRuntimeState;
};

const runtimeState =
  globalForModelState.__dgBrainModelState ??
  (globalForModelState.__dgBrainModelState = {
    lastError: null,
  });

export const brainModel = process.env.AI_BRAIN_MODEL?.trim() || "gpt-5.5";

export function isBrainApiKeyConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function recordBrainModelSuccess() {
  runtimeState.lastError = null;
}

export function recordBrainModelError(error: unknown) {
  runtimeState.lastError = error instanceof Error ? error.message : String(error);
}

export function getBrainModelStatus() {
  return {
    brainModel,
    apiKeyConfigured: isBrainApiKeyConfigured(),
    lastError: runtimeState.lastError,
  };
}
