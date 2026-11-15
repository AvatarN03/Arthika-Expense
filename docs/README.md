# ARTHIKA — Project Documentation

> A local-first personal money management app focused on clarity, control, and everyday decisions.

**Project:** ARTHIKA  
**Initial platform:** React Native + Expo (Android-first is proposed; confirm platform target before platform-specific work)  
**Operating model:** Local-first, offline-capable, no login/backend in the first release.

## Product summary

ARTHIKA helps a person understand where their money is, what they have spent, what they have moved between their own sources, and what money is committed to upcoming obligations such as EMIs.

It is not a complex accounting package or a financial-reporting dashboard. Its primary job is to make everyday money management easier and prevent avoidable surprises.

## Product principles

1. Never represent a manually maintained balance as a live bank balance.
2. Keep tracked balance separate from available-after-commitments.
3. Transfers between the user's own sources are not expenses.
4. An EMI is an obligation before payment; it becomes an expense when paid.
5. Balance corrections must not erase transaction history.
6. Prefer quick everyday workflows over elaborate reporting.
7. Work offline and keep data on-device in the first release.
8. Keep AI optional and outside the critical path.

## Documentation map

- `PRD.md` — product problem, goals, scope, success criteria.
- `FEATURES.md` — functional requirements and behaviour.
- `DOMAIN-MODEL.md` — financial concepts, entities, invariants.
- `DATABASE.md` — proposed local data model and persistence rules.
- `ARCHITECTURE.md` — React Native architecture and stack direction.
- `UI-UX.md` — navigation, screen hierarchy, interaction and visual direction.
- `ROADMAP.md` — ordered implementation phases and small subtasks.
- `AGENT_WORKFLOW.md` — mandatory collaboration and approval rules.

## Mandatory instruction

Read `AGENT_WORKFLOW.md` before modifying code. Read the relevant product/technical documents before each task. Implement only one approved implementation subtask at a time.

Do not silently decide unresolved product behaviour. Identify the decision and ask only when it blocks the current task.

## Technical direction

- React Native + Expo + TypeScript
- Expo Router
- Expo SQLite
- Drizzle ORM **or** direct SQLite queries (choose one after validating Expo SDK compatibility)
- Zustand for genuinely shared/transient UI state
- Zod and React Hook Form
- Expo Notifications
- Expo SecureStore and platform biometric authentication
- Reanimated + Gesture Handler, used selectively
- Lucide React Native
- One styling/component foundation, to be confirmed

Verify package compatibility with the selected Expo SDK. Avoid overlapping libraries.

## Open decisions

- Final package versions and styling/component foundation.
- Android-only or Android + iOS for first release.
- Whether light theme ships in MVP; dark-first is only a proposal.
- Variable EMI installment amounts in MVP or fixed amount only.
- Exact time horizon for “available after commitments”.
- Editable categories in MVP.
- Backup format and restore policy.
- App-lock timeout defaults.
