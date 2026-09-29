import { describe, expect, test } from "bun:test";
import { createEmptyClient } from "@/features/crm/domain";
import { emptyClientProject, type ClientProject } from "@/features/pipeline/project-domain";
import { buildPackageFromParts, type TrainingPackage } from "@/features/training-packages/domain/training-package";
import { clientPerformance, collectTrainingFees, collectTrainingPaymentReminders, feeTotal, filterDashboardByOwner, monthlyTrainingFees, rankClients } from "./domain";

function project(overrides: Partial<ClientProject> = {}): ClientProject {
  return {
    ...emptyClientProject(), id: crypto.randomUUID(), stage: "Delivered", title: "External sales training",
    clientId: "client", clientName: "Example client", clientOwner: "Somaly Phin",
    actualValue: 2500, paymentReceivedDate: "2026-09-29", createdAt: "", updatedAt: "", ...overrides,
  };
}

function proposal(overrides: Partial<TrainingPackage> = {}): TrainingPackage {
  return {
    ...buildPackageFromParts({
      input: { courseTitle: "Leadership", client: "Example client", audience: "Managers", duration: "1 day", context: "", tone: "Practical" },
      outputs: { syllabus: "", proposal: "" }, createdAt: "2026-09-01",
      pricingInputs: { professionalFee: 1200, numberOfParticipants: 20, vatStatus: "Excluding VAT" },
    }),
    clientId: "client", status: "Generated", salesStatus: "Delivered", ...overrides,
  };
}

describe("Actual training revenue", () => {
  test("manual Contracted and Delivered trainings populate monthly revenue and top clients without a proposal", () => {
    const client = { ...createEmptyClient(), id: "client", name: "Example client", accountOwner: "Somaly Phin" };
    const projects = [project(), project({ stage: "Contracted", actualValue: 1500 })];
    const fees = collectTrainingFees([], projects);
    expect(fees.map((fee) => [fee.fee, fee.status, fee.amountLabel, fee.package])).toEqual([
      [2500, "Delivered", "Actual", null], [1500, "Contracted", "Actual", null],
    ]);
    expect(fees[0].project).toBe(projects[0]);
    expect(fees[0]).toMatchObject({ id: projects[0].id, title: projects[0].title, clientId: client.id, client: client.name, href: `/pipeline?projectId=${projects[0].id}` });
    expect(feeTotal(fees)).toBe(4000);
    const months = monthlyTrainingFees(fees, 2026);
    expect(months[16].fee).toBe(2500);
    expect(months[17].fee).toBe(1500);
    expect(months[16].trainings[0]).toBe(fees[0]);
    const ranked = rankClients(clientPerformance(fees, projects, [client]), "revenue", 5);
    expect(ranked[0]).toMatchObject({ revenue: 4000, trainings: 2, delivered: 1, value: 4000 });
    expect(ranked[0].fees).toEqual(fees);
    expect(collectTrainingPaymentReminders(fees, projects)).toEqual([]);
  });

  test("Actual overrides linked proposal fees, including a recorded zero, without double counting", () => {
    const pkg = proposal();
    for (const actualValue of [2500, 0]) {
      const source = project({ trainingPackageId: pkg.id, actualValue });
      const fees = collectTrainingFees([pkg], [source]);
      expect(fees).toHaveLength(1);
      expect(fees[0].fee).toBe(actualValue);
      expect(fees[0].amountLabel).toBe("Actual");
      expect(fees[0].package).toBe(pkg);
      expect(fees[0].project).toBe(source);
      expect(feeTotal(fees)).toBe(actualValue);
    }
  });

  test("an Actual amount does not require a generated proposal, even when a draft is linked", () => {
    const pkg = proposal({ status: "Draft", salesStatus: "Prospects" });
    const fees = collectTrainingFees([pkg], [project({ trainingPackageId: pkg.id })]);
    expect(fees).toHaveLength(1);
    expect(fees[0]).toMatchObject({ fee: 2500, status: "Delivered", amountLabel: "Actual" });
    expect(collectTrainingFees([pkg], [project({ trainingPackageId: pkg.id, actualValue: null })])).toEqual([]);
  });

  test("linked Pipeline stage and client are authoritative rather than stale proposal fields", () => {
    const pkg = proposal({ clientId: "stale-client", salesStatus: "Delivered" });
    const source = project({ trainingPackageId: pkg.id, stage: "Contracted" });
    expect(collectTrainingFees([pkg], [source])[0]).toMatchObject({ clientId: "client", status: "Contracted" });
    for (const stage of ["Prospects", "Warm", "Hot"] as const) {
      expect(collectTrainingFees([pkg], [{ ...source, stage }])).toEqual([]);
    }
  });

  test("uses a linked generated proposal fee only when Actual is missing and never counts Target as revenue", () => {
    const pkg = proposal();
    const source = project({ trainingPackageId: pkg.id, actualValue: null, targetValue: 9999 });
    const fees = collectTrainingFees([pkg], [source]);
    expect(fees).toHaveLength(1);
    expect(fees[0]).toMatchObject({ fee: 1200, amountLabel: "Proposal fee" });
    expect(collectTrainingFees([], [project({ actualValue: null, targetValue: 9999 })])).toEqual([]);
    expect(collectTrainingFees([], [project({ trainingPackageId: "missing-package", actualValue: null })])).toEqual([]);
    expect(collectTrainingFees([], [project({ trainingPackageId: "missing-package" })])[0].fee).toBe(2500);
  });

  test("manual unknown or invalid Actual amounts and other project types do not enter revenue", () => {
    const projects = [
      ...[null, -1, NaN, Infinity].map((actualValue) => project({ actualValue })),
      project({ projectType: "Intelligent System" }), project({ projectType: "Other" }),
      ...(["Prospects", "Warm", "Hot"] as const).map((stage) => project({ stage })),
      project({ actualValue: 0 }),
    ];
    const fees = collectTrainingFees([], projects);
    expect(fees).toHaveLength(1);
    expect(fees[0].fee).toBe(0);
    expect(fees[0].project).toBe(projects.at(-1)!);
  });

  test("manual training without a payment date remains in totals, rankings, and reminders but not monthly revenue", () => {
    const client = { ...createEmptyClient(), id: "client" };
    for (const paymentReceivedDate of [null, "2026-02-30"]) {
      const source = project({ paymentReceivedDate, startPeriod: "2026-09-01", createdAt: "2026-09-01" });
      const fees = collectTrainingFees([], [source]);
      expect(feeTotal(fees)).toBe(2500);
      expect(rankClients(clientPerformance(fees, [source], [client]), "revenue", 5)[0].value).toBe(2500);
      expect(monthlyTrainingFees(fees, 2026).every((row) => row.fee === 0)).toBe(true);
      expect(collectTrainingPaymentReminders(fees, [source])).toHaveLength(1);
      expect(collectTrainingPaymentReminders(fees, [source])[0]).toMatchObject({ id: source.id, amount: 2500, amountLabel: "Actual" });
    }
  });

  test("owner filtering includes manual Actual revenue through client ID, not stale project owner labels", () => {
    const clients = [
      { ...createEmptyClient(), id: "client", accountOwner: "Somaly Phin" },
      { ...createEmptyClient(), id: "other", accountOwner: "Sok Kong" },
    ];
    const projects = [project({ clientOwner: "Wrong owner" }), project({ clientId: "other" }), project({ clientId: null })];
    const fees = collectTrainingFees([], projects);
    const filtered = filterDashboardByOwner(fees, projects, clients, "owner:somaly phin");
    expect(filtered.trainings).toEqual([fees[0]]);
    expect(filtered.projects).toEqual([projects[0]]);
    expect(feeTotal(filtered.trainings)).toBe(2500);
    expect(filterDashboardByOwner(fees, projects, clients, "unassigned").trainings).toEqual([fees[2]]);
  });
});
