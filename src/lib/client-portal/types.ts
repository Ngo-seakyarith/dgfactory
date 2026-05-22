export const portalAccessStatuses = ["Active", "Revoked", "Expired"] as const;
export const portalItemTypes = [
  "Proposal",
  "Syllabus",
  "Training Plan",
  "Delivery Report",
  "Feedback Form",
  "Invoice Placeholder",
] as const;
export const portalVisibilities = ["Client Visible", "Hidden"] as const;
export const portalItemStatuses = ["Draft", "Published", "Archived"] as const;
export const portalDecisionStatuses = [
  "Reviewing",
  "Needs Revision",
  "Approved",
  "Not Approved",
] as const;

export type ClientPortalAccessStatus = (typeof portalAccessStatuses)[number];
export type ClientPortalItemType = (typeof portalItemTypes)[number];
export type ClientPortalVisibility = (typeof portalVisibilities)[number];
export type ClientPortalItemStatus = (typeof portalItemStatuses)[number];
export type ClientPortalDecisionStatus = (typeof portalDecisionStatuses)[number];

export type ClientPortalAccess = {
  id: string;
  clientId: string;
  contactEmail: string;
  accessTokenHash: string;
  status: ClientPortalAccessStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientPortalItem = {
  id: string;
  clientId: string;
  itemType: ClientPortalItemType;
  itemId: string;
  title: string;
  visibility: ClientPortalVisibility;
  status: ClientPortalItemStatus;
  createdAt: string;
  updatedAt: string;
};

export type ClientFeedback = {
  id: string;
  clientId: string;
  relatedItemType: string;
  relatedItemId: string;
  rating: number | null;
  comments: string;
  requestedChanges: string;
  decisionStatus: ClientPortalDecisionStatus | "";
  nextStepPreference: string;
  createdAt: string;
};

export type PortalAccessValidation =
  | { status: "valid"; access: ClientPortalAccess }
  | { status: "not_found" | "revoked" | "expired"; access: ClientPortalAccess | null };

export function isPortalItemType(value: unknown): value is ClientPortalItemType {
  return typeof value === "string" && portalItemTypes.includes(value as ClientPortalItemType);
}

export function isPortalDecisionStatus(
  value: unknown,
): value is ClientPortalDecisionStatus {
  return (
    typeof value === "string" &&
    portalDecisionStatuses.includes(value as ClientPortalDecisionStatus)
  );
}

export function normalizePortalAccess(
  input: Partial<ClientPortalAccess>,
): ClientPortalAccess {
  const now = new Date().toISOString();
  const status = portalAccessStatuses.includes(
    input.status as ClientPortalAccessStatus,
  )
    ? (input.status as ClientPortalAccessStatus)
    : "Active";

  return {
    id: input.id || crypto.randomUUID(),
    clientId: String(input.clientId ?? "").trim(),
    contactEmail: String(input.contactEmail ?? "").trim(),
    accessTokenHash: String(input.accessTokenHash ?? "").trim(),
    status,
    expiresAt: input.expiresAt || null,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

export function normalizePortalItem(input: Partial<ClientPortalItem>): ClientPortalItem {
  const now = new Date().toISOString();
  const itemType = isPortalItemType(input.itemType) ? input.itemType : "Proposal";
  const visibility = portalVisibilities.includes(
    input.visibility as ClientPortalVisibility,
  )
    ? (input.visibility as ClientPortalVisibility)
    : "Client Visible";
  const status = portalItemStatuses.includes(input.status as ClientPortalItemStatus)
    ? (input.status as ClientPortalItemStatus)
    : "Draft";

  return {
    id: input.id || crypto.randomUUID(),
    clientId: String(input.clientId ?? "").trim(),
    itemType,
    itemId: String(input.itemId ?? "").trim(),
    title: String(input.title ?? "").trim(),
    visibility,
    status,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

export function normalizeClientFeedback(
  input: Partial<ClientFeedback>,
): ClientFeedback {
  const parsedRating = Number(input.rating);
  const rating =
    Number.isFinite(parsedRating) && parsedRating > 0
      ? Math.min(5, Math.max(1, parsedRating))
      : null;

  return {
    id: input.id || crypto.randomUUID(),
    clientId: String(input.clientId ?? "").trim(),
    relatedItemType: String(input.relatedItemType ?? "").trim(),
    relatedItemId: String(input.relatedItemId ?? "").trim(),
    rating,
    comments: String(input.comments ?? "").trim(),
    requestedChanges: String(input.requestedChanges ?? "").trim(),
    decisionStatus: isPortalDecisionStatus(input.decisionStatus)
      ? input.decisionStatus
      : "",
    nextStepPreference: String(input.nextStepPreference ?? "").trim(),
    createdAt: input.createdAt || new Date().toISOString(),
  };
}
