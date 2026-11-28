# Database foundation

The app owns one `arthika.db` connection through `getAppDatabase()`. The
`DatabaseProvider` opens and initializes it after mounting, gates child screens,
and supplies the queued client through `useDatabase()`. Server rendering does
not open a database. Failed initialization closes the failed connection and
allows a retry without resetting stored data.

We intentionally provide our queued client rather than expose a raw SQLite
context: a raw connection would let callers bypass transaction isolation.

## Access rules

- Put SQL in database/repository modules, not screen components.
- Use `client.withSession(async session => ...)` for individual reads/writes.
- Use `client.transaction(async session => ...)` for an atomic group.
- Inside either callback, use only the supplied session. Do not re-enter the
  client, retain the session, or start unawaited operations.
- Do not perform network calls or unrelated UI work inside transactions.
- Bind values with `runAsync`/query parameters. `execAsync` is for trusted DDL
  and validated, source-controlled version numbers only.
- All operations, including reads and close, share a FIFO queue. A failed task
  does not prevent later tasks from running.
- The app lifetime owns the connection. Screens must not close it.

Initialization enables and checks foreign keys before starting migrations,
sets a busy timeout, and enables WAL on native platforms. The web backend keeps
its VFS defaults. Ordinary transactions run on that initialized connection;
exclusive transactions would open another connection with different settings.

## Migrations

Add consecutively numbered, named steps to [migrations/index.ts](./migrations/index.ts).
All unapplied changes and `PRAGMA user_version` updates run in one transaction.
A failed upgrade rolls back its changes. A newer-than-supported schema is
rejected, never downgraded or erased. Migration files must not launch background
work or modify previously shipped steps.

The current schema version is five. [Migration 1](./migrations/001-money-sources.ts)
creates `money_sources` and an active-list ordering index; [migration 2](./migrations/002-transactions.ts)
creates `transactions`, its source/date and type/date indexes, and its
foreign-key constraint; [migration 3](./migrations/003-voided-transactions.ts)
adds the `is_voided` flag to `transactions` for the void-and-reverse correction
policy; [migration 4](./migrations/004-transfer-link.ts) adds the `transfer_id`
column linking the two rows of an atomic transfer; [migration 5](./migrations/005-reconciliations.ts)
creates `reconciliations`, recording a balance reconciliation event with its
linked adjustment transaction. No migration seeds financial data. Existing
version-zero through version-four databases upgrade without a reset.

## Money-source repository

[createMoneySourceRepository](./repositories/money-sources.ts) accepts the queued
client supplied by `useDatabase()`; it does not open or close a connection. Its
methods own their sessions/transactions, so do not call them from inside another
client callback. Future compound ledger operations must use their own supplied
session rather than nest repository transactions.

- `create({ name, type, openingBalanceMinor, currencyCode })` validates and
  returns the saved record after commit. Money is already in integer minor units;
  do not pass a formatted amount or multiply a parsed float here.
- `getById(id)` returns a record (including archived records) or `null`.
- `list()` returns active sources; `list({ includeArchived: true })` includes
  archives. Ordering is by creation timestamp then ID, not locale sorting.
- `updateDetails(id, { name, type })` changes non-financial fields only.
- `archive(id)` sets the archive flag; repeats do not change its timestamp.
  Update/archive return `null` for an unknown ID.

The repository maps SQL names and integer flags to typed camelCase fields and
booleans. It does not provide a live query subscription: the Sources screen
reloads after a successful write. Opening balances are signed safe integers;
currency is explicit uppercase three-letter text, not an implicit INR default
or a promise of multi-currency conversion. The API deliberately has no delete,
opening-balance update, or currency update.

## Transaction repository

[createTransactionRepository](./repositories/transactions.ts) is the ledger
write/read layer. It currently supports:

- `createExpense({ amountMinor, sourceId, occurredAt, description?, paymentMethod? })`
  records a debit expense.
- `createAdjustment({ amountMinor, sourceId, direction, occurredAt, description })`
  records a debit or credit correction with a required explanation.
- `getById(id)` returns a record or `null`.
- `list({ sourceId?, type?, limit? })` returns newest-first records, bounded to
  1–100 rows (default 50).
- `listLedgerEntries()` returns only source ID, direction, and amount for
  balance calculation. It includes both voided originals and their reversing
  entries so the pure balance module's arithmetic nets them to zero.
- `voidTransaction(id, reason?)` marks the transaction voided and creates an
  equal-and-opposite reversing adjustment atomically. The original is retained
  for the audit trail; the reason is prefixed into the reversal's description.
  It rejects unknown, transfer, and already-voided transactions.
- `createTransfer({ sourceId, toSourceId, amountMinor, occurredAt })` persists
  both sides of a transfer as two `type='transfer'` rows (one debit, one
  credit) in a single queued transaction, linked by a shared `transfer_id`.
  Both sources must be active and distinct; the two effects net to zero.
- `createReconciliation({ sourceId, previousBalanceMinor, enteredBalanceMinor,
  currencyCode, occurredAt, reason? })` records a reconciliation event and, when
  the tracked and entered balances differ, creates the linked adjustment
  transaction in the same queued transaction. Returns `{ reconciliation,
  adjustment }`. Rejects archived/unknown sources.

Amounts are positive safe-integer minor units; opening balances remain the only
signed money values. The repository trims optional/required text, canonicalizes
input timestamps to UTC, rejects archived sources for new writes, and keeps
SQLite constraints as a second line of defence. `transfer` is a valid stored
type, but transfer creation is deliberately deferred to Phase 5. There is no
in-place edit, delete, category, or EMI-link API yet; corrections use the
void-and-reverse policy from [the correction domain rule](../domain/correction.ts).
The Sources screen combines `listLedgerEntries()` with the pure balance module;
it does not mirror balances into a cached database column.

## Verification

`npm run test:database` runs the database modules against Node's real SQLite
using isolated memory/file databases. It checks initialization, repeated and
failed migrations, binding, foreign keys, rollback, concurrent access, connection
closing, WAL, and file persistence. Source checks cover validation, database
constraints, integer precision, safe edits, archive/history preservation,
concurrent inserts, version-zero upgrades, and reopening saved sources.
Transaction checks cover expense/adjustment creation, validation, constraints,
ordering/filtering, the minimal ledger projection, archived-source write
blocking, historical references, concurrent writes, ledger-to-balance
integration, void-and-reverse corrections, version-one upgrades, rollback, and
file persistence. The tests do not run the Expo native bridge.

[The browser smoke entry](../../scripts/database-smoke.web.ts) is a separate
development-only bundle, not a route or an app import. It uses databases named
`arthika-foundation-check-<timestamp>.db`, never `arthika.db`. For integration
checks, it was served in a temporary same-origin HTML test page with COOP/COEP
headers and this script URL:

```text
/scripts/database-smoke.web.bundle?platform=web&dev=true&hot=false&lazy=true
```

Inspect `globalThis.__ARTHIKA_DATABASE_CHECK__` in that test page. First load runs
the checks and reports `awaiting-reload`; reloading the same test page verifies
persisted records, closes and deletes only its isolated test database, then
reports `passed`. Lazy bundling is required for Expo's Web Worker import.
The temporary HTML route is supplied by browser test interception, not shipped
as an application route. Never add this test entry to the production app.

[The source smoke entry](../../scripts/money-sources-smoke.web.ts) follows the
same two-load protocol with the production migration and repository, using only
`arthika-sources-check-<timestamp>.db`. Serve its bundle at
`/scripts/money-sources-smoke.web.bundle?platform=web&dev=true&hot=false&lazy=true`
and inspect `globalThis.__ARTHIKA_SOURCE_CHECK__`. Its test-only reference table
is not the future transaction schema. It never opens or deletes `arthika.db`.

[The transaction smoke entry](../../scripts/transactions-smoke.web.ts) follows
the same two-load protocol with the production migrations and repositories,
using only `arthika-transactions-check-<timestamp>.db`. Serve its bundle at
`/scripts/transactions-smoke.web.bundle?platform=web&dev=true&hot=false&lazy=true`
and inspect `globalThis.__ARTHIKA_TRANSACTION_CHECK__`. It never opens or
deletes `arthika.db`.

Native Expo Go verification remains pending: open/reopen on Android, repeat a
failed transaction, and confirm source/transaction data survives a full app
restart. Browser and Node results do not establish Android behaviour.
