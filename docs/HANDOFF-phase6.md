# ARTHIKA — Handoff Context (as of end of Phase 6.3)

**Project:** Local-first Expo/React Native money-management app ("Arthika-Expense") at
`e:\Projects\Web-Dev\Mobile\Arthika-Expense`. Expo SDK 58-era codebase (Expo Router in
`src/app/`, components outside routes).

---

## Current status

- **Phase progress:** 6.3 of Phase 6 complete (Phase 6 = Balance update/reconciliation).
  - ✅ 6.1 Reconciliation calculation
  - ✅ 6.2 Atomic adjustment/history persistence
  - ✅ 6.3 Source balance update flow (committed as `6d3af3a`)
  - ⬜ 6.4 Cash reconciliation flow
  - ⬜ 6.5 Explain adjustment in Activity/source detail
- **Phase 7 (EMI)** not started.

---

## Last completed subtask — Phase 6.3 (source balance update flow)

- **New component:** `src/components/sources/update-balance.tsx`
  - Shows tracked balance, decimal-pad input for observed/actual balance, optional reason.
  - Saves via `createReconciliationRepository(client).create({ sourceId, previousBalanceMinor, enteredBalanceMinor, currencyCode, occurredAt, reason })`.
  - Returns `{ reconciliation, adjustment }`.

- **`src/app/sources.tsx`** — "Update balance" button opens the flow per active source;
  save/close refreshes data; uses derived `balanceById` tracked balance as `previousBalance`.

- **Money handling:** `src/lib/money.ts` `parseMajorToMinor` → integer minor units; never
  floats for persisted money.

---

## Key architecture decisions

| Concern | Decision |
|---|---|
| Database | Direct Expo SQLite (chosen over Drizzle) via `src/database/` |
| Migrations | 001 → 005; migration 005 = `reconciliations` table (schema v5) |
| Reconciliation logic | Pure `src/domain/reconciliation.ts` `reconcile()` — atomic adjustment + record if diff ≠ 0, nothing if diff = 0 |
| Corrections | Void-and-reverse policy (Phase 4.4) |
| Transfers | Net-zero debit/credit pairs via `src/domain/transfer.ts` |

---

## Verification commands (all green as of Phase 6.3)

```bash
npm test                          # 25 DB tests + 36 domain tests, 0 fail
npx tsc --noEmit                  # clean
npm run lint                      # clean (expo lint)
npx expo export --platform web   # success
```

Pending: browser smoke / Android Expo Go runtime checks.

---

## Workflow rules

- One roadmap subtask at a time.
- Before a new subtask, provide a concise plan (What / Why / Files / React Native learning /
  Approach / Not included) and ask one approval question unless already approved.
- Financial rules live in domain/repositories, not screens.
- Do not commit/push without approval (commits for completed work are approved); do not
  overwrite uncommitted user changes.
- Run tests + typecheck + lint before declaring work done.

---

## Suggested next task

**Phase 6.4 — Cash reconciliation flow:** a focused reconciliation UI for cash sources.
