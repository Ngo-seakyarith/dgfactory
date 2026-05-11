export const approvalRequiredActions = [
  "send_external_message",
  "publish_client_portal_item",
  "export_with_internal_notes",
  "change_offer_status_scaling",
  "change_offer_status_productized",
  "change_offer_status_killed",
  "approve_prompt_template",
  "deploy_production",
  "run_production_database_migration",
  "delete_client_data",
  "delete_package_data",
  "delete_opportunity_data",
  "delete_delivery_data",
  "expose_internal_margin",
  "expose_internal_knowledge",
  "openclaw_external_action",
] as const;

export type ApprovalRequiredAction = (typeof approvalRequiredActions)[number];

export function normalizeActionType(value: string) {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export function actionRequiresApproval(actionType: string) {
  const normalized = normalizeActionType(actionType);

  if (approvalRequiredActions.includes(normalized as ApprovalRequiredAction)) {
    return true;
  }

  return [
    "send",
    "telegram",
    "whatsapp",
    "email_customer",
    "client_visible",
    "internal_notes",
    "margin",
    "profit",
    "scaling",
    "productized",
    "killed",
    "delete",
    "deploy",
    "migration",
    "prompt_approved",
    "prompt_template_approved",
    "external_action",
  ].some((term) => normalized.includes(term));
}

export function approvalReasonFor(actionType: string) {
  const normalized = normalizeActionType(actionType);

  if (normalized.includes("margin") || normalized.includes("internal_notes")) {
    return "Internal profitability or notes may be exposed.";
  }
  if (normalized.includes("delete")) {
    return "Deletion can remove business records.";
  }
  if (normalized.includes("deploy") || normalized.includes("migration")) {
    return "Production infrastructure changes require human release approval.";
  }
  if (normalized.includes("send") || normalized.includes("telegram") || normalized.includes("email")) {
    return "External messages must be reviewed before sending.";
  }
  if (normalized.includes("scaling") || normalized.includes("productized") || normalized.includes("killed")) {
    return "Offer lifecycle changes affect business selection decisions.";
  }
  if (normalized.includes("prompt")) {
    return "Prompt/template changes can alter agent behavior.";
  }

  return "Risky action requires human approval.";
}
