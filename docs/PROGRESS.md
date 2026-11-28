# ARTHIKA progress

## Latest checkpoint: Phase 6.2 atomic adjustment/history persistence

- Added migration 5 creating the `reconciliations` table (schema version 5),
  recording source, previous/entered balances, difference, currency, reason,
  linked adjustment transaction id, and timestamp. Existing version-four
  databases upgrade without a reset.
- Added `createReconciliationRepository` in
  `src/database/repositories/reconciliations.ts`. Its `create` uses the Phase 6.1
  `reconcile` calculation, then in a single queued transaction validates the
  source, creates the linked adjustment (only when the difference is non-zero),
  and inserts the reconciliation record referencing it. Returns
  `{ reconciliation, adjustment }`. `list` and `getById` support history reads.
- Added integration tests covering atomic persistence + balance effect, the
  zero-difference no-adjustment case, archived/unknown source rejection, and
  close/reopen persistence. Twenty-five database tests and thirty-six
  domain/helper tests pass. TypeScript, lint, and an Expo web export pass.
- Interactive browser persistence and Android/Expo Go checks remain pending.
- Next proposed subtask: Phase 6.3 source balance update flow, after review.

## Previous checkpoint: Phase 6.1 reconciliation calculation (historical)

- Added a pure reconciliation module in `src/domain/reconciliation.ts` exposing
  `reconcile(input)`, which compares a tracked balance with the actual amount
  the user enters and returns the signed difference plus the single debit/credit
  adjustment to apply (or null when they already agree).
- Money values are validated as safe integers in minor units and the currency
  code is validated as three uppercase letters.
- Added Node unit tests in `tests/reconciliation.test.cjs` covering credit,
  debit, zero-difference, signed-previous-balance, unsafe-integer, and currency
  cases.
- Twenty-one database tests and thirty-six domain/helper tests pass. TypeScript,
  lint, and an Expo web export pass.
- Interactive browser persistence and Android/Expo Go checks remain pending.
- Next proposed subtask: Phase 6.2 atomic adjustment/history persistence, after
  review.

## Previous checkpoint: Phase 5.5 verify internal transfer preserves total (historical)

- Added an integration test that creates two sources, records a transfer, and
  asserts the per-currency total tracked money is unchanged, the two source
  balances moved in opposite directions by the exact amount, no expense-typed
  row was created, and both rows are type 'transfer'.
- Twenty-one database tests and thirty domain/helper tests pass. TypeScript,
  lint, and an Expo web export pass.
- Interactive browser persistence and Android/Expo Go checks remain pending.
- Phase 5 (transfers) is complete. Next proposed subtask: Phase 6.1
  reconciliation calculation, after review.

## Previous checkpoint: Phase 5.4 transfer activity and source effects (historical)

- The Activity screen now resolves transfer rows into their source/destination
  pair and shows "from X → to Y" for each transfer, so the audit trail is
  readable and the (voided) status is surfaced alongside it.
- Transfer debits and credits flow through the existing ledger projection, so
  source balances and per-currency totals already reflect them correctly;
  transfers are excluded from expense totals.
- Twenty database tests and thirty domain/helper tests pass. TypeScript, lint,
  and an Expo web export pass.
- Interactive browser persistence and Android/Expo Go checks remain pending.
- Next proposed subtask: Phase 5.5 verify internal transfer preserves total
  tracked money, after review.

## Previous checkpoint: Phase 5.3 transfer form (historical)

- Added a Transfer form sheet that loads active money sources, requires a
  distinct source and destination, parses the amount to integer minor units,
  stamps the current time, and persists through `createTransfer`.
- Wired the Home "Transfer" button to open the form; Home refreshes on close so
  new transfers update balances and activity immediately.
- Optional note is stored as the transfer's description on both rows.
- Twenty database tests and thirty domain/helper tests pass. TypeScript, lint,
  and an Expo web export pass.
- Interactive browser persistence and Android/Expo Go checks remain pending.
- Next proposed subtask: Phase 5.4 transfer activity and source effects, after
  review.

## Previous checkpoint: Phase 5.2 atomic transfer persistence (historical)

- Added migration 4 adding a `transfer_id` column to `transactions` (schema
  version 4), which links the two rows of a transfer together. Existing
  version-three databases upgrade without a reset.
- Added `createTransfer({ sourceId, toSourceId, amountMinor, occurredAt })` to
  the transaction repository. It validates through the Phase 5.1 transfer
  rules, then inserts the debit and credit rows in a single queued transaction,
  linking both to the debit row's generated id. Either both sides exist or
  neither does.
- Both sources must be active (not archived) and distinct. Both rows are
  `type='transfer'` and net to zero across the two sources, so a transfer never
  changes total tracked money and is never an expense.
- Added integration tests covering atomic dual-row persistence, net-zero
  balances, shared transfer_id, same-source rejection, and archived-source
  rejection. Twenty database tests and thirty domain/helper tests pass.
- Interactive browser persistence and Android/Expo Go checks remain pending.
- Next proposed subtask: Phase 5.3 transfer form, after review.

## Previous checkpoint: Phase 5.1 transfer domain rules (historical)

- Added a pure transfer module in `src/domain/transfer.ts` codifying the ledger
  invariants: a transfer is never an expense and never changes total tracked
  money.
- `validateTransfer(input)` requires exactly one distinct source and
  destination, a positive safe-integer amount in minor units, and an ISO
  timestamp with a timezone, returning normalized values.
- `transferLedgerEffects(transfer)` returns the two balanced effects — a debit
  on the source and an equal credit on the destination — in the balance module's
  entry shape, so a future transfer nets to zero across both sources.
- Added Node unit tests in `tests/transfer.test.cjs`, including a check that
  feeding both effects through `calculateTrackedBalances` leaves the currency
  total unchanged. Eighteen database tests and thirty domain/helper tests pass.
- Interactive browser persistence and Android/Expo Go checks remain pending.
- Next proposed subtask: Phase 5.2 atomic transfer persistence, after review.

## Previous checkpoint: Phase 4.5 activity list and basic filters (historical)

- The Activity screen now reads the local database instead of sample data,
  listing up to 100 newest transactions with a type filter chip row (All,
  Expenses, Transfers, Adjustments) showing per-filter counts.
- Voided rows are labelled "Voided", and entries show date, type, debit/credit
  sign, amount in the source's currency, and loading/error/empty states.
- A summary card shows the total of loaded debit expenses and the expense
  count (transfers and adjustments are excluded from expense totals).
- Eighteen database tests and twenty-four domain/helper tests pass; TypeScript,
  lint, and an Expo web export pass. Interactive browser persistence and
  Android/Expo Go checks remain pending.
- Phase 4 (expenses) is complete. Next proposed subtask: Phase 5.1 transfer
  domain rules, after review.

## Previous checkpoint: Phase 4.4 expense detail and edit/correction policy (historical)

- Adopted the domain-recommended correction policy: void-and-reverse. A
  mistaken expense is marked voided (never deleted or rewritten) and an
  equal-and-opposite reversing adjustment is created atomically, so history
  stays auditable and the tracked balance is restored.
- Added migration 3 adding `is_voided` to `transactions` (schema version 3).
  Existing version-two databases upgrade without a reset.
- Added a pure correction rule in `src/domain/correction.ts` (`buildVoidCorrection`)
  that validates a voidable transaction and returns the reverse entry; the
  transaction repository's `voidTransaction(id, reason?)` applies it atomically.
  Ledger projection leaves both the voided original and its reversal present so
  the balance module nets them to zero.
- Added an expense detail modal reachable from Home's recent activity. It shows
  amount, type, direction, timestamp, status, and description, and offers a
  void action with loading/error feedback. Home refreshes after a successful
  void.
- Eighteen database tests and twenty-four domain/helper tests pass. TypeScript,
  whole-project lint, and an Expo web production export pass.
- Interactive browser persistence and Android/Expo Go checks remain pending.
- Next proposed subtask: Phase 4.5 activity list and basic filters, after
  review.

## Previous checkpoint: Phase 4.3 source balance/activity update (historical)

- The Home screen now reads the local database instead of showing placeholder
  totals and sample activity.
- It loads active money sources and ledger entries and computes live balances
  through `calculateTrackedBalances`, displaying the total tracked balance per
  currency and each source's current balance.
- Recent activity lists the newest transactions from the bounded activity list,
  with the debit/credit sign, amount, and date. Empty and error/retry states
  are handled.
- After the Add Expense sheet closes, Home reloads its data, so a saved expense
  immediately updates balances and activity. The modal's onRequestClose also
  triggers the refresh.
- Added an integration test verifying saved expenses appear in the bounded
  recent-activity list and update the derived source balance. Sixteen database
  tests and seventeen domain/helper tests pass; TypeScript, lint, and an Expo
  web export pass.
- Interactive browser persistence and Android/Expo Go checks remain pending.
- Next proposed subtask: Phase 4.4 expense detail and edit/correction policy,
  after review.

## Previous checkpoint: Phase 4.2 expense creation persistence (historical)

- The Add Expense form now writes to the local ledger instead of being a
  preview-only flow.
- It loads active money sources from the database for the source selector,
  converts the typed amount to exact integer minor units with
  `parseMajorToMinor`, validates through `validateExpense`, and persists with
  the transaction repository's `createExpense`.
- The occurred-at timestamp is stamped as the current time (there is no date
  picker yet); the free-text date field was removed. Categories remain
  display-only because the schema has no category column yet.
- The form shows saving/saved/error states, disables inputs and the save button
  while saving, guards against double submission, and surfaces source-load
  failures.
- Added an integration test mirroring the form's write path (parse → validate →
  createExpense). Fifteen database tests and seventeen domain/helper tests
  pass; TypeScript, lint, and an Expo web export pass.
- Interactive browser persistence and Android/Expo Go checks remain pending.
- Next proposed subtask: Phase 4.3 source balance/activity update, after review.

## Previous checkpoint: Phase 4.1 expense domain validation (historical)

- Added a pure expense validation module in `src/domain/expense.ts` that
  validates and normalizes an expense input (positive safe-integer amount in
  minor units, non-empty source ID, ISO timestamp with timezone, optional
  trimmed description and payment method) and returns a typed, normalized
  expense or throws a descriptive error.
- The transaction repository's `createExpense` now consumes this module, so the
  repository, domain, and future expense-creation UI share one validation path.
  Adjustment validation is untouched.
- Added Node unit tests in `tests/expense.test.cjs` covering valid input,
  normalization, optional-field handling, and invalid/boundary cases.
- Fourteen database tests and seventeen domain/helper tests pass. TypeScript,
  whole-project lint, and an Expo web production export pass.
- Interactive browser persistence and Android/Expo Go checks remain pending.
- Next proposed subtask: Phase 4.2 expense creation persistence, after review.

## Previous checkpoint: Phase 3.6 verify persistence across restarts (historical)

- Added a connection-level restart test in `tests/persistence.test.cjs` that
  writes sources and transactions through the repository layer, closes the
  database, reopens the same file as a fresh connection (mimicking an app
  restart), and verifies sources, transactions, and the balances derived from
  them survive intact.
- The test asserts both repositories return the pre-restart records unchanged
  and that `calculateTrackedBalances` reproduces the same per-source balances
  and per-currency totals after the reopen.
- Fourteen database tests and eleven domain/helper tests pass. TypeScript,
  whole-project lint, and an Expo web production export pass.
- Interactive browser persistence and Android/Expo Go checks remain pending.
- Phase 3 (database foundation) is now complete. Next proposed subtask:
  Phase 4.1 expense domain validation, after review.

## Previous checkpoint: Phase 3.5 database-backed source list/create (historical)

- The Sources screen now uses the queued database client and the money-source
  repository instead of local sample data.
- It loads active and archived sources, creates sources, archives sources, and
  refreshes after writes. Loading, load-error/retry, and archive-error states
  are implemented.
- Displayed balances are calculated from each source's opening balance plus its
  ledger entries through the Phase 3.4 domain function. Per-source balances and
  per-currency totals are shown; archived sources are excluded from the active
  total.
- Added `listLedgerEntries()` to the transaction repository: a minimal
  source/direction/amount projection for balance calculation, separate from the
  bounded activity list.
- Added money input/format helpers in `src/lib/money.ts`. Input is converted to
  exact integer minor units before repository calls; display formatting uses
  the source currency.
- The create form prevents duplicate submissions, validates name, amount,
  currency, and requires a zero-or-greater opening balance. The repository still
  supports signed opening balances for later reconciliation flows. The form
  retains the existing visible INR default and assumes two decimal places;
  supported-currency precision remains an open product decision.
- No expense creation, transaction writes, transfers, or balance updates are
  exposed. Update balance remains disabled.
- Thirteen database tests and eleven domain/helper tests pass. TypeScript,
  whole-project lint, and an Expo web production export pass.
- Interactive browser persistence and Android/Expo Go checks remain pending.

## Previous checkpoint: Phase 3.4 balance calculation domain function (historical)

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
transaction schemas/repositories, the pure balance calculation, the
database-backed Sources screen, restart persistence verification, expense
domain validation, expense creation persistence, the database-backed Home
screen, the void-and-reverse correction policy with expense detail, and the
pure transfer domain rules, atomic transfer persistence, a transfer form,
transfer activity/source-effect display, transfer verification, the pure
reconciliation calculation, and atomic reconciliation/adjustment persistence
are implemented. Reconciliation UI and EMI persistence remain unimplemented.
Android runtime checks remain pending. Do not start Phase 6.3 automatically.
