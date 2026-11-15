# Implementation Roadmap — ARTHIKA

## How to execute

The roadmap is ordered, but the agent must implement exactly one subtask at a time. The user wants to learn React Native while building. Every task includes a concise explanation of the relevant concepts. Do not implement an entire phase in one run.

## Phase 0 — Inspect and validate

1. Inspect repository, project type, package manager, Expo SDK, current structure, and Git status.
2. Report current state and mismatches with these docs.
3. Validate Expo SQLite compatibility.
4. Compare Drizzle vs direct SQLite and recommend one.
5. Confirm platform target/styling foundation only when needed.

Do not replace a working scaffold without explanation and approval.

## Phase 1 — App foundation

1. Establish/repair Expo + TypeScript foundation.
2. Configure Expo Router and minimal routes.
3. Configure lint, formatting, TypeScript checks.
4. Add styling foundation and semantic tokens.
5. Add approved ARTHIKA logo assets and identity.
6. Build minimal app shell and bottom navigation.

## Phase 2 — Design system and first UI slice

1. Implement typography, spacing, colours, buttons, inputs, cards, modal/sheet conventions.
2. Build Home with clearly marked placeholder data.
3. Build representative Add Expense UI using temporary data.
4. Review visual direction before expanding screens.

## Phase 3 — Database foundation

1. Configure SQLite and migrations.
2. Implement source schema/repository.
3. Implement transaction schema/repository.
4. Implement balance calculation as a domain function.
5. Add database-backed source list/create.
6. Verify persistence across restarts.

## Phase 4 — Expenses

1. Expense domain validation.
2. Expense creation persistence.
3. Source balance/activity update.
4. Expense detail and edit/correction policy.
5. Activity list and basic filters.

## Phase 5 — Transfers

1. Transfer domain rules.
2. Atomic transfer persistence.
3. Transfer form.
4. Transfer activity and source effects.
5. Verify internal transfer preserves total tracked money and does not count as expense.

## Phase 6 — Balance update/reconciliation

1. Reconciliation calculation.
2. Atomic adjustment/history persistence.
3. Source balance update flow.
4. Cash reconciliation flow.
5. Explain adjustment in Activity/source detail.

## Phase 7 — EMI

1. EMI definition persistence.
2. Idempotent occurrence generation.
3. Occurrence status calculation.
4. EMI list/detail.
5. Create/edit/pause/resume/complete.
6. Atomic payment-to-expense linking.
7. Upcoming commitment calculations.
8. Confirm commitment horizon before Home availability metric.
9. Shortfall warnings.

## Phase 8 — Notifications

1. Validate Expo Notifications on target platform.
2. Central notification service.
3. EMI reminder scheduling.
4. Edit/pause/complete/cancel/reschedule behaviour.
5. Optional reminder preferences.
6. Shortfall notification triggers.

## Phase 9 — Privacy and app lock

1. Global privacy state and amount masking.
2. Persist privacy preference.
3. Secure PIN setup/verification.
4. Biometric unlock where supported.
5. App lifecycle and auto-lock policy.
6. Review sensitive information exposure.

## Phase 10 — Backup and release

1. Define versioned backup format.
2. Export.
3. Validate and restore.
4. Overwrite confirmation and safe import.
5. End-to-end review of core flows.
6. Accessibility, reduced motion, performance, error-state checks.
7. Release build and user-facing limitations.

## Scope control

Do not add AI, cloud sync, login, bank integration, shared expenses, or complex analytics to MVP unless the user changes scope.

If a product decision blocks a task, stop that task, explain the decision and options, and ask one focused question. Do not block unrelated approved work.
