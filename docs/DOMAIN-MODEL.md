# Domain Model — ARTHIKA

## 1. Core concepts

- **Money source:** a place where funds are held (bank, cash, wallet); not a payment rail or income category.
- **Tracked balance:** calculated from user-recorded opening balance, expenses, transfers, and adjustments; only as accurate as user entries.
- **Transaction:** recorded financial event; MVP types include expense, transfer, adjustment.
- **Payment method:** how a payment is made (UPI, bank transfer, cash, card); distinct from source.
- **Commitment:** future obligation that may reduce what the user considers available before it is paid.
- **EMI occurrence:** one scheduled installment, with due date, amount, status, optional linked expense.
- **Reconciliation:** comparison of tracked balance with actual amount observed and entered by the user.

## 2. Ledger invariants

1. A transfer is not an expense.
2. A transfer between owned sources does not change total tracked money.
3. A transfer has exactly one source and destination; they differ.
4. A transfer is atomic.
5. An EMI occurrence is not an expense until paid.
6. A paid occurrence links to exactly one expense.
7. Linking an already-recorded EMI payment must not duplicate it.
8. Reconciliation never rewrites or deletes historical transactions.
9. Adjustments retain timestamp and explanation data.
10. Paid occurrences are excluded from upcoming commitment totals.
11. Archived sources remain resolvable by historical transactions.
12. Persist money as integer minor units (e.g. paise) or safe decimal representation; never use binary floating point for persisted money arithmetic.

## 3. Balance calculation

Conceptually:

`tracked balance = opening balance + credits - expenses + transfer-in - transfer-out + adjustments`

Transfers may be represented as one logical record with two ledger effects or paired entries. Preserve atomicity and invariants.

Future EMI commitments are not yet debits. Display them separately.

## 4. Available after commitments

Conceptually:

`available after commitments = tracked balance - unpaid commitments assigned to this source within the chosen horizon`

- The horizon must be explicit.
- Include only unpaid eligible occurrences in the horizon.
- Exclude paid and skipped occurrences.
- Do not assign an EMI without a preferred source to an arbitrary source.
- Do not subtract an occurrence more than once.
- A negative result is a potential shortfall.
- Do not label this value simply “balance”.

The default horizon is unresolved and requires user approval.

## 5. Reconciliation

`difference = actual balance entered - previous tracked balance`

Record source, previous balance, entered balance, difference, timestamp, optional reason, and linked adjustment. Apply the difference once; preserve past transactions.

## 6. EMI lifecycle and occurrences

Lifecycle:
- Active: future occurrences/reminders generated.
- Paused: no new future occurrences/reminders while paused.
- Completed: no future occurrences/reminders.

Occurrence:
- Upcoming: due date future, not paid/skipped.
- Due today: due date today, not paid/skipped.
- Overdue: due date past, not paid/skipped.
- Paid: confirmed payment linked to one expense.
- Skipped: explicitly skipped, not treated as paid.

Generation must be idempotent. Schedule edits preserve paid history; define future unpaid occurrence handling before implementing edits.

## 7. Deletion and correction

Financial history must not disappear silently. Prefer archive/void for records affecting balances. Corrections should use a documented edit/audit or reversal policy. Exact delete/edit policy must be decided before destructive flows.

## 8. Currency

INR is the likely default because the initial use case is India, but confirm currency handling during setup. Store minor units and format for display using locale-aware formatting. Never parse formatted display strings as source of truth.
