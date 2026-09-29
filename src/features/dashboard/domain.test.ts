import { describe, expect, test } from "bun:test";
import { createEmptyClient } from "@/features/crm/domain";
import { emptyClientProject, type ClientProject } from "@/features/pipeline/project-domain";
import { buildPackageFromParts, type TrainingPackage } from "@/features/training-packages/domain/training-package";
import { clientPerformance, collectTrainingFees, collectTrainingPaymentReminders, dashboardOwnerOptions, feeTotal, filterDashboardByOwner, monthlyTrainingFees, normalizePaymentReceivedDate, projectStageCounts, rankClients } from "./domain";

function training(overrides: Partial<TrainingPackage> = {}): TrainingPackage {
  return {
    ...buildPackageFromParts({
      input: { courseTitle: "Leadership practice", client: "Example client", audience: "Managers", duration: "1 day", context: "", tone: "Practical" },
      outputs: { syllabus: "", proposal: "" },
      createdAt: "2026-09-28T00:00:00Z",
      pricingInputs: { professionalFee: 1200, numberOfParticipants: 20, vatStatus: "Excluding VAT" },
    }),
    status: "Generated", salesStatus: "Delivered", ...overrides,
  };
}

function project(overrides: Partial<ClientProject> = {}): ClientProject {
  return { ...emptyClientProject(), id: crypto.randomUUID(), stage: "Delivered", clientName: "Example client", clientOwner: "", createdAt: "", updatedAt: "", ...overrides };
}

describe("training fees dashboard", () => {
  test("keeps eligible unlinked generated proposals in the overview", () => {
    const packages = [training(), training({ salesStatus: "Contracted" }), ...(["Prospects", "Warm", "Hot"] as const).map((salesStatus) => training({ salesStatus })), training({ status: "Draft", salesStatus: "Contracted" })];
    const fees = collectTrainingFees(packages, []);
    expect(fees.map((fee) => fee.status)).toEqual(["Delivered", "Contracted"]);
    expect(feeTotal(fees)).toBe(2400);
    expect(feeTotal(fees, "Delivered")).toBe(1200);
  });

  test("uses the linked Pipeline payment date and preserves original source rows", () => {
    const pkg = training();
    pkg.proposalBrief.scheduleDate = "2026-01-01";
    const source = project({ trainingPackageId: pkg.id, paymentReceivedDate: "2026-02-15", startPeriod: "2026-03-01" });
    const [fee] = collectTrainingFees([pkg], [source]);
    expect(fee.paymentReceivedDate).toBe("2026-02-15");
    expect(fee.package).toBe(pkg);
    expect(fee.project).toBe(source);
  });

  test("never substitutes training, planning, or creation dates for missing payment dates", () => {
    const pkg = training();
    pkg.proposalBrief.scheduleDate = "2026-12-31";
    const source = project({ trainingPackageId: pkg.id, startPeriod: "2026-12-31", endPeriod: "2026-12-31", createdAt: "2026-12-31" });
    expect(collectTrainingFees([pkg], [source])[0].paymentReceivedDate).toBeNull();
    expect(collectTrainingFees([pkg], [])[0].paymentReceivedDate).toBeNull();
    expect(monthlyTrainingFees(collectTrainingFees([pkg], [source]), 2026).every((row) => row.fee === 0)).toBe(true);
  });

  test("does not guess malformed payment dates and retains undated overview fees", () => {
    for (const paymentReceivedDate of ["", "TBC", "16 & 17 Nov", "28 September 2026", "2026-02-30"]) {
      const pkg = training();
      const fees = collectTrainingFees([pkg], [project({ trainingPackageId: pkg.id, paymentReceivedDate })]);
      expect(fees[0].paymentReceivedDate).toBeNull();
      expect(feeTotal(fees)).toBe(1200);
      expect(monthlyTrainingFees(fees, 2026).every((row) => row.fee === 0)).toBe(true);
    }
  });

  test("rejects invalid dates and accepts actual leap days without timezone drift", () => {
    expect(normalizePaymentReceivedDate(" 2028-02-29 ")).toBe("2028-02-29");
    for (const date of ["2026-02-29", "2026-13-01", "2026-00-01", "2026-09-00", "2026-9-28", "2026-09-28T00:00:00Z"]) expect(normalizePaymentReceivedDate(date)).toBeNull();
  });

  test("groups separate fees into all twelve months and only the selected year", () => {
    const packages = [training(), training({ salesStatus: "Contracted", pricingInputs: { professionalFee: 900, numberOfParticipants: 10, vatStatus: "Including VAT" } }), training(), training()];
    const projects = ["2026-01-01", "2026-01-31", "2026-12-31", "2027-01-01"].map((paymentReceivedDate, index) => project({ stage: index === 1 ? "Contracted" : "Delivered", trainingPackageId: packages[index].id, paymentReceivedDate }));
    const fees = collectTrainingFees(packages, projects);
    const rows = monthlyTrainingFees(fees, 2026);
    expect(rows).toHaveLength(24);
    expect(rows[0].fee).toBe(1200);
    expect(rows[1].fee).toBe(900);
    expect(rows[22].fee).toBe(1200);
    expect(rows.slice(2, 22).every((row) => row.fee === 0)).toBe(true);
    expect(rows.reduce((sum, row) => sum + row.fee, 0)).toBe(3300);
    expect(rows[0].trainings[0]).toBe(fees[0]);
    expect(monthlyTrainingFees(fees, 2027)[0].fee).toBe(1200);
  });

  test("only links payment dates by training package ID, never by company name", () => {
    const pkg = training();
    const fees = collectTrainingFees([pkg], [project({ trainingPackageId: "different-package", clientName: pkg.client, paymentReceivedDate: "2026-09-28" })]);
    expect(fees[0].project).toBeNull();
    expect(fees[0].paymentReceivedDate).toBeNull();
  });

  test("moving or clearing a payment date changes monthly grouping without changing overview totals", () => {
    const pkg = training();
    const source = project({ trainingPackageId: pkg.id, paymentReceivedDate: "2026-02-15" });
    const before = collectTrainingFees([pkg], [source]);
    const after = collectTrainingFees([pkg], [{ ...source, paymentReceivedDate: "2026-11-15" }]);
    const cleared = collectTrainingFees([pkg], [{ ...source, paymentReceivedDate: null }]);
    expect(monthlyTrainingFees(before, 2026)[2].fee).toBe(1200);
    expect(monthlyTrainingFees(after, 2026)[2].fee).toBe(0);
    expect(monthlyTrainingFees(after, 2026)[20].fee).toBe(1200);
    expect(monthlyTrainingFees(cleared, 2026).every((row) => row.fee === 0)).toBe(true);
    expect([before, after, cleared].map((fees) => feeTotal(fees))).toEqual([1200, 1200, 1200]);
  });

  test("ignores invalid fees but retains legitimate zero fees", () => {
    const packages = [-1, NaN, Infinity, 0].map((professionalFee) => training({ pricingInputs: { professionalFee, numberOfParticipants: 20, vatStatus: "Excluding VAT" } }));
    expect(collectTrainingFees(packages, []).map((fee) => fee.fee)).toEqual([0]);
  });

  test("counts every project type across the five stages, including unlinked projects", () => {
    const projects: ClientProject[] = [
      project({ id: "one", stage: "Warm" }),
      project({ id: "two", stage: "Delivered", projectType: "Intelligent System" }),
      project({ id: "three", stage: "Hot", projectType: "Other" }),
    ];
    const rows = projectStageCounts(projects);
    expect(rows).toHaveLength(15);
    expect([...new Set(rows.map((row) => row.stage))]).toEqual(["Prospects", "Warm", "Hot", "Contracted", "Delivered"]);
    expect(rows.reduce((count, row) => count + row.count, 0)).toBe(3);
    expect(rows.find((row) => row.stage === "Warm" && row.type === "Training")?.projects[0]).toBe(projects[0]);
  });

  test("owner choices are sorted, trimmed, and deduplicated without including blanks", () => {
    expect(dashboardOwnerOptions([" Zoe ", "Sopheap", "sopheap ", " "].map((accountOwner) => ({ ...createEmptyClient(), accountOwner })))).toEqual([
      { value: "owner:sopheap", label: "Sopheap" }, { value: "owner:zoe", label: "Zoe" },
    ]);
  });

  test("All owners preserves every source row, including training without linked projects", () => {
    const fees = collectTrainingFees([training()], []);
    const projects = [project()];
    const filtered = filterDashboardByOwner(fees, projects, [], "all");
    expect(filtered.trainings).toBe(fees);
    expect(filtered.projects).toBe(projects);
  });

  test("owner filtering follows client IDs, including training without a Pipeline row", () => {
    const clients = [" SOPHEAP ", "Zoe"].map((accountOwner) => ({ ...createEmptyClient(), accountOwner }));
    const packages = [training({ clientId: clients[0].id }), training({ clientId: clients[1].id }), training({ clientId: clients[0].id })];
    const projects = [project({ clientId: clients[0].id, clientOwner: "Stale owner", trainingPackageId: packages[0].id, paymentReceivedDate: "2026-04-15" }), project({ clientId: clients[1].id, trainingPackageId: packages[1].id, paymentReceivedDate: "2026-04-20" }), project({ clientId: clients[0].id, projectType: "Intelligent System" })];
    const fees = collectTrainingFees(packages, projects);
    const filtered = filterDashboardByOwner(fees, projects, clients, "owner:sopheap");
    expect(filtered.trainings).toEqual([fees[0], fees[2]]);
    expect(filtered.trainings[0]).toBe(fees[0]);
    expect(filtered.projects).toEqual([projects[0], projects[2]]);
    expect(feeTotal(filtered.trainings)).toBe(2400);
    expect(monthlyTrainingFees(filtered.trainings, 2026)[6].fee).toBe(1200);
    expect(projectStageCounts(filtered.projects).reduce((sum, row) => sum + row.count, 0)).toBe(2);
  });

  test("Unassigned includes blank or missing client owners, never similarly named accounts", () => {
    const clients = [" ", "Zoe"].map((accountOwner) => ({ ...createEmptyClient(), name: "Same company", accountOwner }));
    const packages = [training({ clientId: clients[0].id }), training({ clientId: clients[1].id }), training({ clientId: null }), training({ clientId: "missing-client" })];
    const fees = collectTrainingFees(packages, []);
    const projects = [project({ clientId: clients[0].id, trainingPackageId: packages[0].id }), project({ clientId: clients[1].id, trainingPackageId: packages[1].id })];
    const filtered = filterDashboardByOwner(fees, projects, clients, "unassigned");
    expect(filtered.projects).toEqual([projects[0]]);
    expect(filtered.trainings).toEqual([fees[0], fees[2], fees[3]]);
  });

  test("missing owners give an empty result and names cannot collide with special choices", () => {
    const client = { ...createEmptyClient(), accountOwner: "Unassigned" };
    const pkg = training({ clientId: client.id });
    const fees = collectTrainingFees([pkg], []);
    const projects = [project({ clientId: client.id, trainingPackageId: pkg.id })];
    expect(filterDashboardByOwner(fees, projects, [client], "owner:missing").trainings).toHaveLength(0);
    expect(filterDashboardByOwner(fees, projects, [client], "unassigned").trainings).toHaveLength(0);
    expect(filterDashboardByOwner(fees, projects, [client], "owner:unassigned").trainings).toEqual(fees);
  });
});

describe("missing payment dates", () => {
  test("includes imported Contracted and Delivered training without generated proposals", () => {
    const projects = [
      project({ stage: "Contracted", title: "AI Agent and Automation", targetValue: 1000 }),
      project({ stage: "Delivered", title: "Sales training", targetValue: 1800, actualValue: 1500 }),
      ...(["Prospects", "Warm", "Hot"] as const).map((stage) => project({ stage })),
      project({ stage: "Contracted", projectType: "Intelligent System" }),
      project({ stage: "Delivered", projectType: "Other" }),
    ];
    const reminders = collectTrainingPaymentReminders([], projects);
    expect(reminders.map((row) => [row.title, row.status, row.amount, row.amountLabel])).toEqual([
      ["AI Agent and Automation", "Contracted", 1000, "Target"],
      ["Sales training", "Delivered", 1500, "Actual"],
    ]);
    expect(reminders[0].href).toBe(`/pipeline?projectId=${projects[0].id}`);
  });

  test("counts linked training once and uses its Actual value in reminders and totals", () => {
    const pkg = training({ salesStatus: "Contracted" });
    const source = project({ stage: "Contracted", trainingPackageId: pkg.id, targetValue: 2000, actualValue: 100 });
    const fees = collectTrainingFees([pkg], [source]);
    const reminders = collectTrainingPaymentReminders(fees, [source]);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].amount).toBe(100);
    expect(reminders[0].amountLabel).toBe("Actual");
    expect(feeTotal(fees)).toBe(100);
    expect(monthlyTrainingFees(fees, 2026).every((row) => row.fee === 0)).toBe(true);
  });

  test("removes records once their payment dates are recorded and does not substitute planning dates", () => {
    const source = project({ stage: "Contracted", startPeriod: "2026-09-01", targetValue: 1000 });
    expect(collectTrainingPaymentReminders([], [source])).toHaveLength(1);
    expect(collectTrainingPaymentReminders([], [{ ...source, paymentReceivedDate: "2026-09-29" }])).toEqual([]);
    expect(collectTrainingPaymentReminders([], [{ ...source, paymentReceivedDate: "2026-02-30" }])).toHaveLength(1);
  });

  test("preserves missing amounts and legitimate zero amounts without inventing fees", () => {
    const projects = [
      project({ stage: "Contracted" }),
      project({ stage: "Delivered", actualValue: 0, targetValue: 1000 }),
      project({ stage: "Delivered", actualValue: NaN, targetValue: -1 }),
    ];
    expect(collectTrainingPaymentReminders([], projects).map((row) => [row.amount, row.amountLabel])).toEqual([
      [null, null], [0, "Actual"], [null, null],
    ]);
  });

  test("keeps eligible unlinked packages and respects the selected client owner", () => {
    const clients = ["Somaly Phin", "Sok Kong"].map((accountOwner) => ({ ...createEmptyClient(), accountOwner }));
    const pkg = training({ clientId: clients[0].id });
    const fees = collectTrainingFees([pkg], []);
    const projects = clients.map((client) => project({ clientId: client.id, stage: "Contracted" }));
    const filtered = filterDashboardByOwner(fees, projects, clients, "owner:somaly phin");
    const reminders = collectTrainingPaymentReminders(filtered.trainings, filtered.projects);
    expect(reminders.map((row) => row.id)).toEqual([projects[0].id, pkg.id]);
    expect(reminders[1].href).toBe(`/packages/${pkg.id}`);
  });
});

describe("top clients", () => {
  test("groups by client ID, keeps evidence, and counts each training only once", () => {
    const clients = ["Alpha", "Beta"].map((name) => ({ ...createEmptyClient(), name }));
    const packages = [training({ clientId: clients[0].id }), training({ clientId: clients[0].id, salesStatus: "Contracted" }), training({ clientId: clients[1].id, salesStatus: "Hot" })];
    const projects = [
      project({ clientId: clients[0].id, trainingPackageId: packages[0].id, stage: "Delivered" }),
      project({ clientId: clients[0].id, trainingPackageId: packages[1].id, stage: "Contracted" }),
      project({ clientId: clients[0].id, projectType: "Intelligent System", stage: "Delivered" }),
      project({ clientId: clients[0].id, projectType: "Other", stage: "Delivered" }),
      project({ clientId: clients[1].id, trainingPackageId: packages[2].id, stage: "Hot" }),
    ];
    const fees = collectTrainingFees(packages, projects);
    const rows = clientPerformance(fees, projects, clients);
    expect(rows[0].client).toBe(clients[0]);
    expect(rows[0].projects[0]).toBe(projects[0]);
    expect(rows[0].fees[0]).toBe(fees[0]);
    expect(rows[0].revenue).toBe(2400);
    expect(rows[0].trainings).toBe(2);
    expect(rows[0].delivered).toBe(1);
    expect(rows[0].systems).toBe(1);
    expect(rows[1].revenue).toBe(0);
    expect(rows[1].trainings).toBe(1);
  });

  test("ranks independently by revenue, training count, delivered count, and system count", () => {
    const clients = ["Alpha", "Beta", "Gamma"].map((name) => ({ ...createEmptyClient(), name }));
    const packages = [training({ clientId: clients[0].id }), training({ clientId: clients[0].id })];
    const projects = [
      ...Array.from({ length: 3 }, () => project({ clientId: clients[1].id, stage: "Delivered" })),
      ...Array.from({ length: 4 }, () => project({ clientId: clients[2].id, projectType: "Intelligent System" })),
    ];
    const rows = clientPerformance(collectTrainingFees(packages, projects), projects, clients);
    expect(rankClients(rows, "revenue", 5)[0].client.name).toBe("Alpha");
    expect(rankClients(rows, "trainings", 5)[0].client.name).toBe("Beta");
    expect(rankClients(rows, "delivered", 5)[0].value).toBe(3);
    expect(rankClients(rows, "systems", 5)[0].client.name).toBe("Gamma");
    expect(rankClients(rows, "revenue", 5)).toHaveLength(1);
  });

  test("ties use alphabetical order, limits apply after sorting, and source rows stay unchanged", () => {
    const clients = ["Zeta", "alpha", "Beta"].map((name) => ({ ...createEmptyClient(), name }));
    const projects = clients.map((client) => project({ clientId: client.id }));
    const rows = clientPerformance([], projects, clients);
    const ranked = rankClients(rows, "trainings", 2);
    expect(ranked.map((row) => [row.client.name, row.rank])).toEqual([["alpha", 1], ["Beta", 2]]);
    expect(rows.map((row) => row.client.name)).toEqual(["Zeta", "alpha", "Beta"]);
    expect(ranked[0].projects[0]).toBe(projects[1]);
  });

  test("does not merge similar names or guess clients for orphan records", () => {
    const clients = [createEmptyClient(), createEmptyClient()].map((client) => ({ ...client, name: "Same company" }));
    const packages = [training({ clientId: clients[0].id }), training({ clientId: "missing-client", client: "Same company" }), training({ clientId: null, client: "Same company" })];
    const projects = [project({ clientId: clients[1].id }), project({ clientId: null }), project({ clientId: "missing-client" })];
    const rows = clientPerformance(collectTrainingFees(packages, projects), projects, clients);
    expect(rows).toHaveLength(2);
    expect(rows[0].revenue).toBe(1200);
    expect(rows[0].trainings).toBe(0);
    expect(rows[1].revenue).toBe(0);
    expect(rows[1].trainings).toBe(1);
  });

  test("owner filters apply to every ranking without including inactive clients", () => {
    const clients = ["Somaly Phin", "Sok Kong", ""].map((accountOwner) => ({ ...createEmptyClient(), name: accountOwner || "Unassigned", accountOwner }));
    const packages = clients.map((client) => training({ clientId: client.id }));
    const projects = clients.map((client) => project({ clientId: client.id, stage: "Delivered" }));
    const fees = collectTrainingFees(packages, projects);
    const filtered = filterDashboardByOwner(fees, projects, clients, "owner:sok kong");
    const rows = clientPerformance(filtered.trainings, filtered.projects, clients);
    expect(rankClients(rows, "revenue", 10).map((row) => row.client.name)).toEqual(["Sok Kong"]);
    expect(rankClients(rows, "trainings", 10).map((row) => row.client.name)).toEqual(["Sok Kong"]);
    expect(rankClients([], "revenue", 5)).toEqual([]);
  });
});

function actualProject(overrides: Partial<ClientProject> = {}): ClientProject {
  return {
    ...emptyClientProject(), id: crypto.randomUUID(), stage: "Delivered", title: "External sales training",
    clientId: "client", clientName: "Example client", clientOwner: "Somaly Phin",
    actualValue: 2500, paymentReceivedDate: "2026-09-29", createdAt: "", updatedAt: "", ...overrides,
  };
}

function actualProposal(overrides: Partial<TrainingPackage> = {}): TrainingPackage {
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
    const projects = [actualProject(), actualProject({ stage: "Contracted", actualValue: 1500 })];
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
    const pkg = actualProposal();
    for (const actualValue of [2500, 0]) {
      const source = actualProject({ trainingPackageId: pkg.id, actualValue });
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
    const pkg = actualProposal({ status: "Draft", salesStatus: "Prospects" });
    const fees = collectTrainingFees([pkg], [actualProject({ trainingPackageId: pkg.id })]);
    expect(fees).toHaveLength(1);
    expect(fees[0]).toMatchObject({ fee: 2500, status: "Delivered", amountLabel: "Actual" });
    expect(collectTrainingFees([pkg], [actualProject({ trainingPackageId: pkg.id, actualValue: null })])).toEqual([]);
  });

  test("linked Pipeline stage and client are authoritative rather than stale proposal fields", () => {
    const pkg = actualProposal({ clientId: "stale-client", salesStatus: "Delivered" });
    const source = actualProject({ trainingPackageId: pkg.id, stage: "Contracted" });
    expect(collectTrainingFees([pkg], [source])[0]).toMatchObject({ clientId: "client", status: "Contracted" });
    for (const stage of ["Prospects", "Warm", "Hot"] as const) {
      expect(collectTrainingFees([pkg], [{ ...source, stage }])).toEqual([]);
    }
  });

  test("uses a linked generated proposal fee only when Actual is missing and never counts Target as revenue", () => {
    const pkg = actualProposal();
    const source = actualProject({ trainingPackageId: pkg.id, actualValue: null, targetValue: 9999 });
    const fees = collectTrainingFees([pkg], [source]);
    expect(fees).toHaveLength(1);
    expect(fees[0]).toMatchObject({ fee: 1200, amountLabel: "Proposal fee" });
    expect(collectTrainingFees([], [actualProject({ actualValue: null, targetValue: 9999 })])).toEqual([]);
    expect(collectTrainingFees([], [actualProject({ trainingPackageId: "missing-package", actualValue: null })])).toEqual([]);
    expect(collectTrainingFees([], [actualProject({ trainingPackageId: "missing-package" })])[0].fee).toBe(2500);
  });

  test("manual unknown or invalid Actual amounts and other project types do not enter revenue", () => {
    const projects = [
      ...[null, -1, NaN, Infinity].map((actualValue) => actualProject({ actualValue })),
      actualProject({ projectType: "Intelligent System" }), actualProject({ projectType: "Other" }),
      ...(["Prospects", "Warm", "Hot"] as const).map((stage) => actualProject({ stage })),
      actualProject({ actualValue: 0 }),
    ];
    const fees = collectTrainingFees([], projects);
    expect(fees).toHaveLength(1);
    expect(fees[0].fee).toBe(0);
    expect(fees[0].project).toBe(projects.at(-1)!);
  });

  test("manual training without a payment date remains in totals, rankings, and reminders but not monthly revenue", () => {
    const client = { ...createEmptyClient(), id: "client" };
    for (const paymentReceivedDate of [null, "2026-02-30"]) {
      const source = actualProject({ paymentReceivedDate, startPeriod: "2026-09-01", createdAt: "2026-09-01" });
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
    const projects = [actualProject({ clientOwner: "Wrong owner" }), actualProject({ clientId: "other" }), actualProject({ clientId: null })];
    const fees = collectTrainingFees([], projects);
    const filtered = filterDashboardByOwner(fees, projects, clients, "owner:somaly phin");
    expect(filtered.trainings).toEqual([fees[0]]);
    expect(filtered.projects).toEqual([projects[0]]);
    expect(feeTotal(filtered.trainings)).toBe(2500);
    expect(filterDashboardByOwner(fees, projects, clients, "unassigned").trainings).toEqual([fees[2]]);
  });
});
