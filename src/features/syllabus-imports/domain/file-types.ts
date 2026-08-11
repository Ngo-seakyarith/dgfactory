export const syllabusSourceFormats = ["docx", "pptx", "pdf"] as const;
export type SyllabusSourceFormat = (typeof syllabusSourceFormats)[number];

export const syllabusMimeTypes: Record<SyllabusSourceFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pdf: "application/pdf",
};

export const syllabusFileAccept = [
  ".docx",
  ".pptx",
  ".pdf",
  ...Object.values(syllabusMimeTypes),
].join(",");

export function syllabusSourceFormatFromName(name: string) {
  const extension = name.toLowerCase().split(".").pop();
  return syllabusSourceFormats.find((format) => format === extension) ?? null;
}

export function isSupportedSyllabusFileName(name: string) {
  return syllabusSourceFormatFromName(name) !== null;
}

export function defaultSyllabusMimeType(name: string) {
  const format = syllabusSourceFormatFromName(name);
  return format ? syllabusMimeTypes[format] : "application/octet-stream";
}
