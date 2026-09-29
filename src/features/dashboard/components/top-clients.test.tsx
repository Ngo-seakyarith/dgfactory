import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createEmptyClient } from "@/features/crm/domain";
import { type ClientPerformance } from "../domain";
import { TopClients } from "./top-clients";

const rows: ClientPerformance[] = ["Angkor Green", "Zuellig Pharma", "SOS Cambodia"].map((name, index) => ({
  id: `client-${index}`, client: { ...createEmptyClient(), id: `client-${index}`, name },
  revenue: index === 2 ? 2400 : 4500, trainings: 1, delivered: 1, systems: 0, projects: [], fees: [],
}));

describe("Top clients presentation", () => {
  test("shows one ranking chart without a repeated list or automatic client selection", () => {
    const html = renderToStaticMarkup(<TopClients rows={rows} />);
    expect(html).toContain("Top 3 clients ranked by revenue");
    for (const row of rows) expect(html.match(new RegExp(row.client.name, "g"))).toHaveLength(1);
    expect(html).not.toContain("Ranked clients");
    expect(html).not.toContain("<details");
    expect(html).not.toContain("/pipeline?clientId=");
  });

  test("keeps ranking controls and the empty state without rendering a chart", () => {
    const html = renderToStaticMarkup(<TopClients rows={[]} />);
    expect(html).toContain('id="client-ranking-metric"');
    expect(html).toContain('id="client-ranking-limit"');
    expect(html).toContain("No Contracted or Delivered training fees for these clients.");
    expect(html).not.toContain("<svg");
    expect(html).not.toContain("/pipeline?clientId=");
  });
});
