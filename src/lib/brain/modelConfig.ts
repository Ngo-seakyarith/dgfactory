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

export const brainModel = "openai/gpt-5.5";
export const brainReasoningEffort = "low" as const;

export function isBrainApiKeyConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
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
