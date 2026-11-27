# Domain rules

Pure TypeScript financial rules. These modules must not import React, Expo,
SQLite, or screen code. They receive plain values and return plain values, so
they can be tested without a device or database.

## Money

- Persist and calculate money as integer minor units.
- Never use binary floating point for persisted money arithmetic.
- Ledger amounts are positive magnitudes; `direction` supplies the sign.
- Opening balances are the only signed money values in the balance module.

## Balance

[balance.ts](./balance.ts) treats credits as additions and debits as
subtractions, so expenses, adjustments, and future transfer entries share one
rule. A transfer must be supplied as a paired debit and credit. The balance
function can verify the arithmetic but cannot enforce that the two writes are
atomic; that belongs to the transfer repository/application layer.

`calculateTrackedBalances` returns per-source balances and totals grouped by
currency. It never converts currencies or adds different currencies together.
Archived/voided filtering is a caller decision because the domain module does
not know UI or lifecycle policy.

## Expense

[expense.ts](./expense.ts) exposes `validateExpense(input)`, a pure function
that validates and normalizes a user-supplied expense and returns the exact
values a repository should persist, or throws a descriptive error for the first
invalid field. Amounts must be positive safe integers in minor units, the
source ID must be non-empty, and the timestamp must be a valid ISO instant with
a timezone. Description and payment method are optional text that is trimmed
and stored as `null` when blank. The transaction repository's `createExpense`
uses this module so screens, repositories, and future flows share one
validation path.
