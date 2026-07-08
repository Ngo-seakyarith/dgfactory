import trainerData from "@/data/trainers.json";

export type TrainerCatalogEntry = {
  id: string;
  name: string;
  imageUrl: string;
  bio: string;
  experience: string[];
  qualifications: string[];
};

export type TrainerSnapshotFields = {
  trainerId: string;
  trainerImageUrl: string;
  trainerName: string;
  trainerTitle: string;
  trainerBio: string;
  trainerExperience: string;
  trainerQualifications: string;
};

type RawTrainerEntry = {
  name: string;
  image: string;
  bio: string;
  experience?: string[];
  qualifications?: string[];
};

function trainerId(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanItems(value?: string[]) {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

export const trainerCatalog: TrainerCatalogEntry[] = (
  trainerData as RawTrainerEntry[]
).map((trainer) => ({
  id: trainerId(trainer.name),
  name: trainer.name.trim(),
  imageUrl: trainer.image.trim(),
  bio: trainer.bio.trim(),
  experience: cleanItems(trainer.experience),
  qualifications: cleanItems(trainer.qualifications),
}));

export function getTrainerById(id: string) {
  return trainerCatalog.find((trainer) => trainer.id === id) ?? null;
}

export function trainerSnapshotFields(
  trainer: TrainerCatalogEntry,
): TrainerSnapshotFields {
  return {
    trainerId: trainer.id,
    trainerImageUrl: trainer.imageUrl,
    trainerName: trainer.name,
    trainerTitle: "Trainer & Speaker",
    trainerBio: trainer.bio,
    trainerExperience: trainer.experience.join("\n"),
    trainerQualifications: trainer.qualifications.join("\n"),
  };
}

export function isTrustedTrainerImageUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "ik.imagekit.io" &&
      url.pathname.startsWith("/9u9rdfh7t/thedgacademy/Trainer%20Photo/")
    );
  } catch {
    return false;
  }
}
