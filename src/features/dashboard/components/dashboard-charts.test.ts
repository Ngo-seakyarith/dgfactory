import { describe, expect, test } from "bun:test";
import { createChartScene, defaultChartTheme } from "@tanstack/charts/scene";
import { renderChartSvg } from "@tanstack/charts/svg";
import { clientPerformance, collectTrainingFees, monthlyTrainingFees, projectStageCounts, rankClients, type ClientRankingMetric, type RankedClient } from "../domain";
import { createEmptyClient } from "@/features/crm/domain";
import { buildPackageFromParts } from "@/features/training-packages/domain/training-package";
import { emptyClientProject } from "@/features/pipeline/project-domain";
import { createMonthlyFeesChart, createProjectStagesChart, createTopClientsChart } from "./dashboard-charts";

describe("dashboard charts", () => {
  for (const width of [350, 1100]) {
    test(`monthly chart infers domains and preserves typed rows at ${width}px`, () => {
      const rows = monthlyTrainingFees([], 2026);
      rows[0].fee = 4500;
      rows[1].fee = 2400;
      rows[22].fee = 1200;
      const scene = createChartScene(createMonthlyFeesChart(rows), { width, height: 320 });
      expect(scene.points).toHaveLength(24);
      expect(scene.points[0].datum).toBe(rows[0]);
      expect(scene.chart.width).toBeGreaterThan(0);
      expect(scene.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= 320)).toBe(true);
      const svg = renderChartSvg(scene, { ariaLabel: "Monthly fees" });
      expect(svg).toContain('role="img"');
      expect(svg).toContain("Jan");
      expect(svg).toContain("Dec");
      expect(svg).toContain("#17776b");
      expect(svg).toContain("#b77912");
      expect(svg).not.toMatch(/NaN|Infinity/);
    });
  }

  test("empty monthly data compiles without invalid geometry", () => {
    const scene = createChartScene(createMonthlyFeesChart(monthlyTrainingFees([], 2026)), { width: 350, height: 320 });
    expect(scene.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
  });

  test("chart assigns a fee to the payment month, not the training month", () => {
    const pkg = buildPackageFromParts({
      input: { courseTitle: "Leadership", client: "Example", audience: "Managers", duration: "1 day", context: "", tone: "Practical" },
      outputs: { syllabus: "", proposal: "" }, createdAt: "2026-09-28T00:00:00Z",
      pricingInputs: { professionalFee: 1200, numberOfParticipants: 20, vatStatus: "Excluding VAT" },
    });
    pkg.status = "Generated";
    pkg.salesStatus = "Delivered";
    pkg.proposalBrief.scheduleDate = "2026-01-01";
    const project = { ...emptyClientProject(), id: "one", trainingPackageId: pkg.id, paymentReceivedDate: "2026-11-15", clientName: "Example", clientOwner: "", createdAt: "", updatedAt: "" };
    const fees = collectTrainingFees([pkg], [project]);
    const rows = monthlyTrainingFees(fees, 2026);
    const scene = createChartScene(createMonthlyFeesChart(rows), { width: 1100, height: 320 });
    const november = scene.points.find((point) => point.datum.month === "Nov" && point.datum.status === "Delivered");
    expect(november?.datum.fee).toBe(1200);
    expect(november?.datum.trainings[0].project).toBe(project);
    expect(scene.points.filter((point) => point.datum.month === "Jan").every((point) => point.datum.fee === 0)).toBe(true);
  });

  test("project stage scene preserves project evidence and readable stage labels", () => {
    const project = { ...emptyClientProject(), id: "one", clientName: "Example", clientOwner: "", createdAt: "", updatedAt: "" };
    const rows = projectStageCounts([project]);
    const scene = createChartScene(createProjectStagesChart(rows), { width: 350, height: 280 });
    expect(scene.points).toHaveLength(15);
    expect(scene.points[0].datum.projects[0]).toBe(project);
    const svg = renderChartSvg(scene, { ariaLabel: "Project stages" });
    for (const stage of ["Prospects", "Warm", "Hot", "Contracted", "Delivered"]) expect(svg).toContain(stage);
    expect(svg).not.toMatch(/NaN|Infinity/);
  });

  for (const width of [350, 1100]) {
    test(`client ranking chart preserves typed sources and fits at ${width}px`, () => {
      const client = { ...createEmptyClient(), name: "A very long client company name that must not overflow on mobile" };
      const project = { ...emptyClientProject(), id: "one", clientId: client.id, stage: "Delivered" as const, clientName: client.name, clientOwner: "", createdAt: "", updatedAt: "" };
      const rows = rankClients(clientPerformance([], [project], [client]), "trainings", 5);
      const chart = createTopClientsChart(rows, "trainings");
      const definition = chart.chart({ width, height: 200, defaultTheme: defaultChartTheme });
      const scene = createChartScene<RankedClient, number, string>(definition, { width, height: 200 });
      expect(scene.points).toHaveLength(1);
      expect(scene.points[0].datum).toBe(rows[0]);
      expect(scene.points[0].datum.client).toBe(client);
      expect(scene.points[0].datum.projects[0]).toBe(project);
      expect(chart.focus).toBe("nearest");
      const content = chart.tooltip.content(scene.points);
      expect(content.title).toBe(client.name);
      expect(content.rows.map((row) => row.value)).toEqual(["$0.00", "1", "1", "0"]);
      expect(scene.points[0].x).toBeGreaterThan(0);
      expect(scene.points[0].x).toBeLessThanOrEqual(width);
      expect(scene.chart.width).toBeGreaterThan(100);
      const svg = renderChartSvg(scene, { ariaLabel: "Top clients" });
      expect(svg).toContain("1. A very long");
      expect(svg).toContain("#326ca6");
      expect(svg).not.toMatch(/NaN|Infinity/);
    });
  }

  test("all ranking modes render an empty scene safely", () => {
    for (const metric of ["revenue", "trainings", "delivered", "systems"] as const satisfies readonly ClientRankingMetric[]) {
      const definition = createTopClientsChart([], metric).chart({ width: 350, height: 200, defaultTheme: defaultChartTheme });
      const scene = createChartScene(definition, { width: 350, height: 200 });
      expect(scene.points).toHaveLength(0);
      expect(renderChartSvg(scene, { ariaLabel: "Top clients" })).not.toMatch(/NaN|Infinity/);
    }
  });
});
