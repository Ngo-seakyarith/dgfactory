import type { SecurityAuditItem } from "@/lib/security/types";

export const securityChecklistSections = [
  {
    category: "Authentication",
    checks: [
      "Production requires `DG_REQUIRE_AUTH=true`.",
      "Admin role selection is protected by `ADMIN_ACCESS_PIN`.",
      "Server routes re-check permissions instead of trusting hidden UI.",
    ],
  },
  {
    category: "Role permissions",
    checks: [
      "Sales cannot approve prompts or view internal profitability notes.",
      "Trainer cannot access admin prompt templates or internal pricing margins.",
      "Viewer is read-only.",
    ],
  },
  {
    category: "Supabase RLS",
    checks: [
      "Every public table has RLS enabled.",
      "Service role key is server-only.",
      "Policies are reviewed before wider deployment.",
    ],
  },
  {
    category: "Client export safety",
    checks: [
      "Client exports scan for internal markers before download.",
      "Internal notes require explicit Admin permission.",
      "Exported filenames are clean and client-appropriate.",
    ],
  },
  {
    category: "Internal notes protection",
    checks: [
      "Internal source notes do not appear in client exports by default.",
      "Pilot and eval reports are marked internal.",
    ],
  },
  {
    category: "Pricing margin protection",
    checks: [
      "Client-facing commercial proposal excludes direct cost, margin, and profit.",
      "Pricing calculations stay deterministic.",
    ],
  },
  {
    category: "Prompt injection resistance",
    checks: [
      "Knowledge documents are treated as untrusted input.",
      "Malicious instructions in knowledge content cannot override system rules.",
    ],
  },
  {
    category: "Orchestrator endpoint security",
    checks: [
      "Every `/api/orchestrator/*` route requires `ORCHESTRATOR_API_KEY`.",
      "Commands are validated against the allowed command list.",
      "Risky commands become approval requests.",
    ],
  },
  {
    category: "Approval workflow",
    checks: [
      "External sending, deletion, deployment, payment, and client data export require human approval.",
      "Approval decisions are logged and do not execute side effects automatically.",
    ],
  },
  {
    category: "Audit logging",
    checks: [
      "Exports, approvals, orchestrator commands, prompt changes, and security audits are logged.",
      "Logs redact keys, tokens, secrets, passwords, and authorization headers.",
    ],
  },
  {
    category: "Environment variables",
    checks: [
      "Server-only keys do not use `NEXT_PUBLIC_`.",
      "Missing keys fall back safely without leaking configuration.",
    ],
  },
  {
    category: "Secret handling",
    checks: [
      "OpenAI, Supabase service role, orchestrator, and loop keys are never committed.",
      "Pasted or exposed secrets are rotated before production use.",
    ],
  },
  {
    category: "File export safety",
    checks: [
      "DOCX/PPTX/PDF/TXT export routes are server-side.",
      "Risky export content is blocked or requires explicit Admin internal export.",
    ],
  },
  {
    category: "Knowledge base visibility",
    checks: [
      "`Internal` knowledge is not exposed to client exports by default.",
      "`Client-safe` knowledge can be used in client-facing language only when appropriate.",
    ],
  },
];

export function createSecurityChecklistItems(auditId: string): SecurityAuditItem[] {
  return securityChecklistSections.flatMap((section) =>
    section.checks.map((check) => ({
      id: crypto.randomUUID(),
      auditId,
      category: section.category,
      title: check,
      description: check,
      status: "Not Checked" as const,
      severity: section.category.includes("Secret") ||
        section.category.includes("margin") ||
        section.category.includes("Orchestrator")
          ? "High" as const
          : "Medium" as const,
      evidence: "",
      recommendation: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  );
}
