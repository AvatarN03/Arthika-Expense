# Technical Architecture — ARTHIKA

## 1. Goals

Local-first, offline-capable, understandable to a developer learning React Native, with small modules and clear responsibility boundaries. Financial rules must not live in screen components. Keep the dependency footprint lean.

## 2. Proposed stack

| Concern | Direction | Status |
|---|---|---|
| Framework | React Native | Agreed |
| Tooling | Expo | Recommended |
| Language | TypeScript | Recommended |
| Navigation | Expo Router | Recommended |
| Local DB | Expo SQLite | Foundation implemented; native verification pending |
| Data access | Direct Expo SQLite with typed repositories | Approved for MVP |
| UI state | Zustand only where useful | Recommended |
| Forms | React Hook Form | Recommended |
| Validation | Zod | Recommended |
| Notifications | Expo Notifications | Recommended |
| Secure preferences | Expo SecureStore | Recommended |
| Biometrics | OS local-auth API via compatible package | Validate |
| Styling | NativeWind or one alternative | Open choice |
| Motion/gestures | Reanimated + Gesture Handler | Selective |
| Icons | Lucide React Native | Recommended |
| Charts | Only if validated need exists | Deferred |

Check Expo SDK compatibility before installing native dependencies. Avoid overlapping component libraries and state tools.

## 3. Layer boundaries

- **Presentation:** screens, navigation, reusable components, forms, loading/error/empty states.
- **Application:** use cases such as create expense, transfer, reconcile source, mark EMI paid, generate occurrences.
- **Domain:** pure rules for balance, transfer, EMI schedule/status, commitment, reconciliation, currency precision.
- **Data:** SQLite schema, migrations, repositories, queries, backup/import/export.
- **Platform services:** notifications, secure storage, biometrics, app lifecycle, haptics.

Keep architecture pragmatic. Do not introduce elaborate abstractions without a demonstrated need.

## 4. Suggested structure

Refine after inspecting the existing project. Expo Router's route directory must follow the selected template's convention.

```text
src/
  components/
    ui/
    shared/
  features/
    home/
    sources/
    expenses/
    transfers/
    activity/
    reconciliation/
    emis/
    settings/
    app-lock/
  domain/
    money/
    transactions/
    commitments/
    emis/
  database/
    schema/
    migrations/
    repositories/
  services/
    notifications/
    security/
    backup/
  store/
  hooks/
  lib/
  theme/
  types/
app/                       # Expo Router routes, if required by chosen template
```

## 5. State management

SQLite is the source of truth for persistent financial data. Do not mirror the entire database into Zustand. Zustand can hold transient/shared UI state such as privacy mode and filters. Persist settings deliberately. Do not add TanStack Query to a local-only app unless it solves a demonstrated async-state/caching problem.

## 6. Financial operations

Implement financial rules in domain/application functions, not screens. Use database transactions for:
- Transfer debit + credit.
- EMI occurrence paid + linked expense.
- Reconciliation + adjustment.
- Backup restore/import.

Make occurrence generation and notification scheduling idempotent.

## 7. Notifications

A central service handles permission, scheduling, cancellation/rescheduling, duplicate prevention, date/time boundaries, and persisted EMI schedules. Explain that local notifications cannot see unrecorded bank activity.

## 8. App lock and privacy

- Secure platform storage for PIN verification material.
- Never persist plain-text PIN.
- Use OS biometrics; do not access/store biometric templates.
- Handle app foreground/background transitions.
- Privacy mode must mask amounts consistently across all screens.
- Avoid sensitive values in logs and notification previews where feasible.
- Document platform limitations honestly.

## 9. Quality and accessibility

Validate input at boundaries. Give actionable errors. Include loading/empty/error states. Support screen readers, adequate touch targets, contrast, keyboard behaviour, and reduced motion. Avoid distracting animation.

## 10. Performance

Use virtualized lists for long histories, query only required data, avoid unnecessary background services and expensive animations, and defer charting until needed. Implement small vertical slices.
