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

The current schema version is one. [Migration 1](./migrations/001-money-sources.ts)
creates only `money_sources` and an active-list ordering index, with no sample
seeds. Existing version-zero databases upgrade without a reset.

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
booleans. It does not provide a live query subscription: a future screen must
refresh state after a successful write. No screen consumes it yet. Opening
balances are signed safe integers; currency is explicit uppercase three-letter
text, not an implicit INR default or a promise of multi-currency conversion.
The API deliberately has no delete, opening-balance update, or currency update.

## Verification

`npm run test:database` runs the database modules against Node's real SQLite
using isolated memory/file databases. It checks initialization, repeated and
failed migrations, binding, foreign keys, rollback, concurrent access, connection
closing, WAL, and file persistence. Source checks cover validation, database
constraints, integer precision, safe edits, archive/history preservation,
concurrent inserts, version-zero upgrades, and reopening saved sources.
It does not run the Expo native bridge.

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

Native Expo Go verification remains pending: open/reopen on Android, repeat a
failed transaction, and confirm data survives a full app restart. Browser and
Node results do not establish Android behaviour.
