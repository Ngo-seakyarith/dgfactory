const durationOnlyPattern = /^(?:duration\s*:\s*)?\d+(?:\.\d+)?\s*(?:min(?:ute)?s?|hours?|hrs?)$/i;

export function contentOutlineSessionTitle(value: string) {
  const match = value.match(/^session\s+\d+\s*([^|]*)/i);
  if (!match) return null;
  return match[1]
    .replace(/^\s*[:\-\u2013\u2014]\s*/, "")
    .trim();
}

export function isDurationOnlyOutline(value: string) {
  return durationOnlyPattern.test(value.trim());
}

export function isBreakOnlyContentOutline(value: string) {
  const withoutSession = value.replace(
    /^session\s+\d+\s*[:|\-\u2013\u2014]?\s*/i,
    "",
  );
  const withoutDuration = withoutSession
    .replace(/\b(?:duration\s*:\s*)?\d+(?:\.\d+)?\s*(?:min(?:ute)?s?|hours?|hrs?)\b/gi, "")
    .replace(/[|;:\-\u2013\u2014]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /^(?:(?:short|coffee|tea|lunch)\s+)?break$/i.test(withoutDuration);
}

export function normalizeContentOutlineItems(items: string[]) {
  return items.flatMap((item) => {
    if (isBreakOnlyContentOutline(item)) {
      const parts = item
        .replace(/^session\s+\d+\s*[:|\-\u2013\u2014]?\s*/i, "")
        .split(/\s*[|;]\s*/)
        .map((part) => part.trim())
        .filter(Boolean);
      const label = parts.find((part) => /break/i.test(part)) ?? "Break";
      const duration = parts.find(isDurationOnlyOutline);
      return [`${label}${duration ? ` | ${duration}` : ""}`];
    }

    const titlelessSession = item.match(/^(session\s+\d+)\s*\|\s*(.+)$/i);
    if (!titlelessSession) return [item];

    const details = titlelessSession[2]
      .split(/;\s*/)
      .map((detail) => detail.trim())
      .filter(Boolean);
    const titleIndex = details.findIndex(
      (detail) =>
        !isDurationOnlyOutline(detail) &&
        !isBreakOnlyContentOutline(detail),
    );
    if (titleIndex < 0) return [item];

    const title = details[titleIndex];
    const remaining = details
      .filter((_, index) => index !== titleIndex)
      .map((detail) =>
        isDurationOnlyOutline(detail) && !/^duration\s*:/i.test(detail)
          ? `Duration: ${detail}`
          : detail,
      );

    return [
      `${titlelessSession[1]}: ${title}${
        remaining.length ? ` | ${remaining.join("; ")}` : ""
      }`,
    ];
  });
}
