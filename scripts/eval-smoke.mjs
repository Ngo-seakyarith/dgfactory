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
  const examples = [
    "SME workshop output includes practical workflow use cases and a 30-day plan.",
    "Corporate in-house output includes governance, productivity, and client context.",
    "Executive masterclass output includes decision framework, risk, and next steps.",
  ];
  const scores = examples.map((example) => {
    let score = 70;
    if (/workflow|governance|decision/i.test(example)) score += 10;
    if (/client|executive|sme|corporate/i.test(example)) score += 8;
    if (/margin|profit|guarantee/i.test(example)) score -= 20;
    return score;
  });
  const average = Math.round(
    scores.reduce((total, score) => total + score, 0) / scores.length,
  );

  if (average < 72) {
    throw new Error(`Eval smoke failed in local mock mode. Average ${average}.`);
  }

  console.log(
    `Eval smoke passed in local mock mode: ${examples.length} examples, average ${average}.`,
  );
  console.log(
    "Set EVAL_BASE_URL=http://localhost:3000 to run against the app API.",
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
