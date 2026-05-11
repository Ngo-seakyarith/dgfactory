# Ralph-Style Codex Loop

This folder contains a safe developer workflow for turning structured stories in
`tasks/prd.json` into one-story Codex build iterations.

It is not a production automation. It must not deploy, migrate production data,
send external messages, delete important files, bypass tests, or commit secrets.

## Commands

```bash
npm run ralph:plan
npm run ralph:next
npm run ralph:check
```

`ralph:plan` validates the PRD and shows the highest-priority pending story.

`ralph:next` prints the recommended branch command, exact Codex prompt, and
quality commands for the next story.

`ralph:check` validates required task files and prints the quality gate.

## Optional Shell Runner

`scripts/ralph/ralph-codex.sh` can be used on bash-compatible systems. By
default it prints instructions. It only invokes Codex when
`RALPH_ALLOW_CODEX=1` is set by the developer.

```bash
bash scripts/ralph/ralph-codex.sh
RALPH_ALLOW_CODEX=1 bash scripts/ralph/ralph-codex.sh
```

## Human Approval Rules

- One story per iteration.
- Human review is required before merge.
- Mark `passes=true` only after the story-specific checks pass.
- Append learnings to `tasks/progress.txt`.
- Update docs when behavior changes.
- Suggest AGENTS.md updates when the workflow reveals a durable rule.
