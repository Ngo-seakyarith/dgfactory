export const autonomyLevels = [
  "manual",
  "assisted",
  "supervised",
  "bounded_auto",
] as const;

export type AutonomyLevel = (typeof autonomyLevels)[number];

export type AutonomySettings = {
  autonomyLevel: AutonomyLevel;
  updatedAt: string;
};

const globalForAutonomy = globalThis as typeof globalThis & {
  __dgAutonomySettings?: AutonomySettings;
};

const defaultSettings: AutonomySettings = {
  autonomyLevel: "assisted",
  updatedAt: new Date().toISOString(),
};

export function isAutonomyLevel(value: unknown): value is AutonomyLevel {
  return typeof value === "string" && autonomyLevels.includes(value as AutonomyLevel);
}

export function getAutonomySettings() {
  return globalForAutonomy.__dgAutonomySettings ?? defaultSettings;
}

export function saveAutonomySettings(autonomyLevel: AutonomyLevel) {
  const settings = {
    autonomyLevel,
    updatedAt: new Date().toISOString(),
  };
  globalForAutonomy.__dgAutonomySettings = settings;
  return settings;
}

export function canExecuteLowRiskInternalAction(level: AutonomyLevel) {
  return level === "supervised" || level === "bounded_auto";
}

export function canRunScheduledLowRiskLoops(level: AutonomyLevel) {
  return level === "bounded_auto";
}
