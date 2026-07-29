import {
  getTrainerById,
  trainerCatalog,
  type TrainerCatalogEntry,
} from "@/features/training-packages";

function personNameKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|dr|prof|professor)\.?\b/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function matchTrainerName(value: string) {
  const key = personNameKey(value);
  if (!key) return null;
  const matches = trainerCatalog.filter(
    (trainer) => personNameKey(trainer.name) === key,
  );
  return matches.length === 1 ? matches[0] : null;
}

export function resolveImportTrainers({
  trainerNames,
  trainerId,
  secondTrainerId,
}: {
  trainerNames: string[];
  trainerId: string;
  secondTrainerId: string;
}) {
  if (trainerId) {
    const primary = getTrainerById(trainerId);
    const secondary = secondTrainerId ? getTrainerById(secondTrainerId) : null;
    return {
      trainers:
        primary && secondary && primary.id !== secondary.id
          ? [primary, secondary]
          : primary
            ? [primary]
            : [],
      unresolved: primary ? [] : [trainerId],
    };
  }

  const matched: TrainerCatalogEntry[] = [];
  const unresolved: string[] = [];
  for (const name of trainerNames.slice(0, 2)) {
    const trainer = matchTrainerName(name);
    if (!trainer) unresolved.push(name);
    else if (!matched.some((item) => item.id === trainer.id)) matched.push(trainer);
  }
  if (matched.length === 0 && unresolved.length === 0) unresolved.push("Trainer not found");
  return { trainers: matched, unresolved };
}
