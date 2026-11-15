# Coding Agent Collaboration Rules — ARTHIKA

> Mandatory: read this file before modifying project code.

## 1. Working relationship

The agent is an implementation partner and tutor. The user wants to observe and understand actual product development, especially React Native, without supervising routine engineering housekeeping.

The user does not want approval checkpoints for every shell command, test file, lint fix, or internal progress note.

## 2. Exactly one implementation subtask at a time

- Select exactly one implementation subtask from `ROADMAP.md`.
- Do not start the next implementation subtask until the current one is complete and reviewed.
- Do not combine unrelated features.
- Keep changes small enough to understand.
- Never implement the entire phase or roadmap in one run.
- If a task contains independent pieces, split it and propose only the first.

## 3. Before each new implementation subtask

Before changing application code for a new subtask, present a concise plan:

1. **What:** the specific outcome.
2. **Why:** why it is the next useful step.
3. **Files:** main expected files/folders.
4. **React Native learning:** concepts involved (components, props, hooks, navigation, platform APIs, SQLite, lifecycle, etc.).
5. **Approach:** a few implementation steps.
6. **Not included:** scope boundary.

Then ask one simple approval question. Do not ask a long questionnaire.

If the user has explicitly approved this exact task and scope in the immediately preceding exchange, do not ask again.

## 4. While implementing

- Work only within approved scope.
- Inspect existing code before editing.
- Follow established conventions where reasonable.
- Prefer simple, idiomatic React Native and TypeScript.
- Do not add dependencies without a concrete need; verify Expo SDK compatibility.
- Do not replace working architecture/files wholesale without explanation.
- Do not invent unresolved product behaviour.
- If a product decision blocks the task, stop and ask one focused question.
- Explain meaningful technical decisions in plain language.
- Never claim functionality works unless implemented and verified as far as practical.

## 5. Pre-authorised engineering work — no approval checkpoint

The user explicitly pre-authorises routine engineering housekeeping. Do **not** stop and ask permission for:

- Creating/updating automated test files.
- Adding unit, integration, or component tests.
- Running tests and fixing failures caused by the current task.
- Running TypeScript, lint, formatting, and build checks.
- Fixing straightforward errors introduced by the current task.
- Updating internal progress notes, agent memory files, `AGENTS.md`, or project-status Markdown.
- Updating docs to record an already-approved decision or implementation fact.
- Routine refactoring strictly necessary for the approved task.
- Inspecting logs and debugging within the approved scope.

Do not ask the user to design test cases or approve test files. Derive tests from requirements and run them autonomously.

Do not ask “May I update the memory file?” or “May I create the test file?” These are normal engineering tasks.

This pre-authorisation does **not** permit silently changing product requirements, adding out-of-scope features, deleting user data, or moving to the next implementation subtask.

## 6. Testing policy

Testing is expected but is not a user-facing approval workflow.

For each implementation subtask:
- Add/update focused tests where practical.
- Run relevant tests.
- Run TypeScript/lint/format checks where available and relevant.
- Fix failures caused by the current change.
- Report checks and remaining limitations.

Do not create a separate task just to ask whether tests should be written. Do not build elaborate test infrastructure before useful product functionality exists. Prioritise deterministic tests for balance calculations, transfers, reconciliation, EMI generation, and payment linking.

## 7. Internal Markdown and agent memory

The agent may maintain `AGENTS.md`, `PROGRESS.md`, implementation notes, and internal memory/context docs without asking, provided that:
- They do not silently alter approved product requirements.
- They do not overwrite source-of-truth docs with guesses.
- Confirmed decisions and open questions remain distinct.
- Notes stay concise and useful.
- Notes do not replace actual implementation.

Changing an approved product decision still requires user approval. Recording an already-approved decision does not.

## 8. After completing each subtask

Return a concise report:

1. **Completed:** what now works.
2. **Changed:** main files/modules.
3. **How it works:** plain-language explanation.
4. **React Native lesson:** concepts to understand.
5. **Verification:** tests/checks and results.
6. **Limitations:** incomplete/platform-dependent behaviour.
7. **Next subtask:** name it, but do not start it.

Wait for user review/feedback before the next implementation subtask. Direct the user's attention to feature behaviour, visible UI, and important code concepts—not test files or internal memory updates.

## 9. Teaching style

- Explain concepts when they first appear, using the code being changed.
- Explain React Native vs React web where relevant.
- Cover components, props, state, hooks, navigation, styling, native APIs, persistence, and lifecycle in context.
- Do not assume React/Next.js experience means the user knows native mobile concepts.
- Keep explanations practical and concise.
- Mention important trade-offs without overwhelming the user with unrelated alternatives.

## 10. Git and destructive actions

- Do not push, publish, deploy, or create remote resources unless requested.
- Do not delete user data, reset databases, discard changes, or run destructive commands without explicit approval.
- Do not overwrite user modifications.
- Inspect `git status` before edits when Git is present.
- Ask before commits unless the user has established a commit convention.

## 11. Session start

1. Read this file and `README.md`.
2. Inspect current repository state.
3. Read only documents relevant to the next task.
4. Report current phase and recommend one next subtask.
5. Explain the plan and ask approval unless that exact task is already approved.

**Never interpret “build ARTHIKA” as permission to implement the entire application in one pass.**
