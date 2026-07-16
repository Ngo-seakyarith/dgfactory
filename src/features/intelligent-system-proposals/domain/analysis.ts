import type {
  CombinedDatasetAnalysis,
  DatasetProfile,
  DatasetRelationship,
} from "./types";

function fieldKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function combineDatasetProfiles(
  profiles: DatasetProfile[],
): CombinedDatasetAnalysis {
  const includedSheets = profiles.flatMap((profile) =>
    profile.sheets
      .filter((sheet) => sheet.included)
      .map((sheet) => ({ profile, sheet })),
  );
  const fields = new Map<string, Array<{ label: string; name: string; distinct: number }>>();

  includedSheets.forEach(({ profile, sheet }) => {
    sheet.columns.forEach((column) => {
      const key = fieldKey(column.name);
      if (!key) return;
      const values = fields.get(key) ?? [];
      values.push({
        label: `${profile.fileName} / ${sheet.name}`,
        name: column.name,
        distinct: column.distinctCount,
      });
      fields.set(key, values);
    });
  });

  const relationships: DatasetRelationship[] = [...fields.values()]
    .filter((items) => new Set(items.map((item) => item.label)).size > 1)
    .map((items) => {
      const sources = [...new Set(items.map((item) => item.label))];
      const identifierLike = /id|code|number|account|customer|client|product/i.test(
        items[0].name,
      );
      return {
        field: items[0].name,
        sources,
        confidence: identifierLike ? ("high" as const) : ("medium" as const),
        evidence: `A normalized field named "${items[0].name}" appears in ${sources.length} sources. Confirm the values use the same definition before joining.`,
      };
    })
    .slice(0, 30);

  return {
    profiles,
    totalFiles: profiles.length,
    totalSheets: includedSheets.length,
    totalRows: profiles.reduce((sum, profile) => sum + profile.totalRows, 0),
    analyzedRows: profiles.reduce((sum, profile) => sum + profile.analyzedRows, 0),
    partial: profiles.some((profile) => profile.partial),
    relationships,
    warnings: [...new Set(profiles.flatMap((profile) => profile.warnings))],
  };
}
