# ARTHIKA progress

## Latest checkpoint: Phase 3.4 balance calculation domain function

- Added a pure [balance module](../src/domain/balance.ts) with no React, Expo,
  SQLite, or screen imports.
- Credits add and debits subtract, so expenses, debit/credit adjustments, and
  future paired transfer entries share one signed rule.
- Per-source balances and per-currency totals are calculated from opening
  balances plus ledger entries. Currencies are never converted or added
  together; archive/void filtering remains a caller decision.
- Inputs are validated as safe-integer minor units. Duplicate or unknown source
  references, non-positive amounts, invalid directions, and unsafe overflow are
  rejected.
- No schema, repository, or screen changed. No cached balance column or balance
  mutation was introduced.
- Eight domain tests pass. All twelve existing database tests, TypeScript, and
  whole-project lint pass.
- Next proposed subtask: Phase 3.5 database-backed source list/create, after
  review.

## Previous checkpoint: Phase 3.3 transaction schema/repository (historical)

- User approved the transaction-persistence subtask; no transaction UI or
  expense form is included.
- Schema version 2 adds only `transactions`, its foreign-key constraint, and
  source/date and type/date indexes. Version-zero and version-one databases
  upgrade without resets or sample data.
- Added a typed repository for creating expenses and debit/credit adjustments,
  lookup by ID, and bounded newest-first listing with source/type filters.
  Transfers, edits, voids, categories, and EMI links remain deferred.
- Transaction amounts are positive safe-integer minor units. The repository
  trims text, canonicalizes timestamps to UTC, rejects archived sources for new
  writes, and keeps SQLite constraints as a second line of defence.
- Twelve Node/real-SQLite tests pass, including production migration rollback,
  version-one upgrade preservation, validation, database constraints, ordering,
  archive/history protection, concurrent writes, and file close/reopen
  persistence.
- TypeScript and whole-project lint pass. The transaction browser smoke entry
  was not run in this session, and Android runtime verification remains pending.
- Screens still use sample data and none consume the repositories. Source
  creation/list UI belongs to Phase 3.5.
- Next proposed subtask: Phase 3.4 balance calculation as a domain function,
  after review.

## Previous checkpoint: Phase 3.2 money-source schema/repository (historical)

- User approved the next source-persistence subtask; no source UI or expense
  implementation is included.
- Schema version 1 adds only `money_sources` and its active-list index. Existing
  version-zero databases upgrade without resets or sample source seeds.
- Added a typed repository for create/read/list, non-financial name/type edits,
  and idempotent archive. Archived sources retain stable IDs and references.
- Opening balances remain signed safe-integer minor units. Currency is required
  explicitly; no INR default, conversion, or supported-currency UI was invented.
- No hard-delete, opening-balance edit, or currency-edit API is exposed.
- Eight Node/real-SQLite tests pass, including production migration rollback,
  preservation of pre-existing data, source constraints, validation, concurrent
  creation, archive/reference preservation, and file close/reopen persistence.
- TypeScript and whole-project lint pass. The six shared repository checks also
  pass through Expo's actual web SQLite worker, with cross-origin isolation.
  A full browser reload preserved sources, IDs, money, edits, archive flags, and
  references; the isolated test database was then closed and deleted. No actual
  app database was reset or populated with test data.
- The actual Expo app returned to Home after initializing the production schema.
- Bundled SQLite guidance informed bound parameters, asynchronous access, and
  transaction ownership. No dependency or UI changes were needed.
- Expo Go/Android runtime verification remains pending. Screens still use sample
  data; source creation/list UI belongs to Phase 3.5.
- Next proposed subtask: Phase 3.3 transaction schema/repository, after review.

## Previous checkpoint: Phase 3.1 database foundation (historical)

- User approved direct Expo SQLite and the scoped database foundation.
- Installed `expo-sqlite` 58.0.18 through Expo's SDK-aware installer.
- Implemented a single app-owned connection, serialized access, foreign-key
  initialization, native WAL, transactional migration runner, and React startup
  loading/error/retry handling. No raw database is exposed through context.
- No product migrations or tables exist yet; production schema version is zero.
- Added WASM and COOP/COEP development-server configuration, preserving Expo's
  default middleware. Browser storage remains separate from phone storage.
- Four Node/real-SQLite tests pass, including repeated and failed migrations,
  parameter binding, foreign keys, rollback, queued access, schema downgrade
  rejection, close/reopen persistence, and native-style WAL setup.
- Real Expo web-worker checks passed for migrations, binding, transaction foreign
  keys, rollback, queue isolation, and failed migration rollback. A full browser
  reload preserved records; the isolated test database was then closed/deleted.
- The actual web app reached Home after its database initialized with isolation
  and SharedArrayBuffer available. Installing dependencies required a clean
  Metro restart to remove stale module IDs.
- The loading/error/retry UI is implemented. A network-header fault-injection
  attempt timed out and is not counted as a passed UI recovery test.
- TypeScript passes. SDK-compatible ESLint tooling/configuration was added;
  the final whole-source lint result is recorded below when available.
- The package's bundled SQLite guidance informed connection setup, atomic
  migrations, and preservation of existing web middleware.
- Native Expo Go verification remains pending: no connected Android runtime
  was available. Node/browser results do not establish native restart behaviour.
- Home/Add Expense still use sample data. No source or expense persistence was
  added. Next proposed subtask: Phase 3.2, money-source schema and repository.

Usage and verification details: [database README](../src/database/README.md).

## Previous checkpoint: data-access comparison (historical)

- [Comparison and recommendation](./DATA-ACCESS-RECOMMENDATION.md) completed:
  direct Expo SQLite is recommended for the MVP, pending user approval.
- Drizzle remains a viable alternative; no SDK 58 runtime compatibility or
  benchmark claims are made for it.
- The architecture/database source-of-truth documents still leave the choice
  open. No packages, schema, or application code were changed for this review.
- TypeScript passes; lint is blocked by missing configuration.
- Proposed next implementation: Phase 3.1, SQLite initialization and migration
  infrastructure only. Do not begin product table/repository work yet.

## Previous checkpoint: SQLite compatibility review

- User approved proceeding with SDK-matched SQLite validation after the laptop
  review. No additional UI changes or database implementation were made here.
- [Compatibility findings](./SQLITE-COMPATIBILITY.md) confirm documented SDK 58
  and Expo Go support against the installed SDK metadata. SQLite is not yet
  installed, so runtime behaviour remains unverified.
- Foreign-key/transaction constraints and web setup requirements are recorded
  for the implementation task; they are not implemented features.
- TypeScript passes. Lint remains blocked by missing configuration, and no
  dependency changes were retained.
- Next proposed subtask: compare Drizzle with direct Expo SQLite. Database
  setup and migrations have not started.

## Previous checkpoint: Phase 2 visual review

- Home and Add Expense use temporary sample data; nothing is persisted.
- The Expo app preview is separate from the landing-page prototype.
- Browser review found that Expo NativeTabs renders a floating top menu on web.
  The root layout now reserves space for it on web only; Android/iOS navigation
  is unchanged.
- Browser layout checks used verified CSS viewport widths of 320, 390, and
  768 pixels: the logo clears navigation and the summary amounts stay within the
  viewport. Summary cards stack at 320 pixels.
- Earlier viewport requests did not match the actual browser width; those
  checks are superseded by the verified device-metrics checks above.
- TypeScript and whitespace checks pass. ESLint is not configured; the lint
  command cannot complete without installing/configuring the missing tooling.
- No dependency changes were retained for this review.

## Still awaiting review

- User visual feedback on Home and Add Expense.
- Expo Go checks for Android keyboard, safe areas, native tab icons, and Back.
- Native launch-screen colours are not covered by this browser review.

## Database work still outstanding

Direct SQLite, its connection/migration foundation, the money-source and
transaction schemas/repositories, and the pure balance calculation are
implemented. Database-backed source management, transaction UI, transfers,
reconciliation, and EMI persistence remain unimplemented. Android runtime
checks remain pending. Do not start Phase 3.5 automatically.
