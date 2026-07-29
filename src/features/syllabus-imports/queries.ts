"use client";

import { useQuery, type QueryClient } from "@tanstack/react-query";

import { requestJson } from "@/lib/api-client";

import type { SyllabusProposalImport } from "./domain/types";

export const syllabusImportKeys = {
  all: ["syllabus-imports"] as const,
  list: () => [...syllabusImportKeys.all, "list"] as const,
  detail: (id: string) => [...syllabusImportKeys.all, "detail", id] as const,
};

export function useSyllabusImportsQuery() {
  return useQuery({
    queryKey: syllabusImportKeys.list(),
    queryFn: async () => {
      const payload = await requestJson<{ imports: SyllabusProposalImport[] }>(
        "/api/syllabus-imports",
      );
      return payload.imports;
    },
    refetchInterval(query) {
      const imports = query.state.data;
      return imports?.some((value) =>
        ["Uploaded", "Processing", "Finalizing"].includes(value.status),
      )
        ? 4_000
        : false;
    },
  });
}

export function useSyllabusImportQuery(id: string) {
  return useQuery({
    queryKey: syllabusImportKeys.detail(id),
    queryFn: async () => {
      const payload = await requestJson<{ import: SyllabusProposalImport }>(
        `/api/syllabus-imports/${id}`,
      );
      return payload.import;
    },
    enabled: Boolean(id),
  });
}

export function setSyllabusImportQueryData(
  queryClient: QueryClient,
  value: SyllabusProposalImport,
) {
  queryClient.setQueryData(syllabusImportKeys.detail(value.id), value);
  queryClient.setQueryData<SyllabusProposalImport[]>(
    syllabusImportKeys.list(),
    (current) => {
      if (!current) return current;
      return [value, ...current.filter((item) => item.id !== value.id)].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );
    },
  );
}
