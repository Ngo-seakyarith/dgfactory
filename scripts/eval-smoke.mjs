const baseUrl = process.env.EVAL_BASE_URL;
const datasetId =
  process.env.EVAL_DATASET_ID ?? "11111111-1111-4111-8111-111111111111";

async function runApiSmoke() {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/evals/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ datasetId, workflowId: "eval-smoke" }),
  });
  const payload = await response.json();

  if (!response.ok || !payload.run) {
    throw new Error(payload.error ?? "Eval smoke API run failed.");
  }

  console.log(
    `Eval smoke passed through API: ${payload.dataset.name}, average ${payload.run.averageScore}.`,
  );
}

function runLocalSmoke() {
  throw new Error(
    "EVAL_BASE_URL is required. Eval smoke now runs against the configured app API, not local generated data.",
  );
}

try {
  if (baseUrl) {
    await runApiSmoke();
  } else {
    runLocalSmoke();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Eval smoke failed.");
  process.exit(1);
}
