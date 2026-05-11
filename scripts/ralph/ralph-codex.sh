#!/usr/bin/env bash
set -euo pipefail

MAX_ITERATIONS="${MAX_ITERATIONS:-1}"

if [ "$MAX_ITERATIONS" -lt 1 ]; then
  echo "MAX_ITERATIONS must be at least 1."
  exit 1
fi

echo "Ralph-style Codex loop for DG Academy Training Factory"
echo "This developer workflow is safe by default and will stop after ${MAX_ITERATIONS} iteration(s)."
echo ""

for iteration in $(seq 1 "$MAX_ITERATIONS"); do
  echo "Iteration ${iteration}/${MAX_ITERATIONS}"
  npm run ralph:check
  echo ""
  npm run ralph:next
  echo ""

  if [ "${RALPH_ALLOW_CODEX:-0}" != "1" ]; then
    echo "RALPH_ALLOW_CODEX is not set to 1, so Codex was not invoked."
    echo "Run the printed Codex command manually after human review."
    exit 0
  fi

  if ! command -v codex >/dev/null 2>&1; then
    echo "Codex CLI was not found. Run the printed command manually."
    exit 0
  fi

  echo "Automatic Codex invocation is enabled by RALPH_ALLOW_CODEX=1."
  echo "Invoking Codex for one story only."
  codex "$(cat scripts/ralph/prompt.md)"
  echo "Codex returned. Run quality checks and review changes before any commit."
done

echo "Ralph loop stopped after MAX_ITERATIONS=${MAX_ITERATIONS}."
