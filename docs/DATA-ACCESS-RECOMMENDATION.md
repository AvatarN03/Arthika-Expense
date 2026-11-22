# Data-access recommendation: direct Expo SQLite

Reviewed: 2026-11-22. Status: **approved by the user for MVP implementation**.

The comparison below records the pre-implementation review. The user subsequently
approved Phase 3.1; see [current progress](./PROGRESS.md) for implementation and
verification results.
Scope: roadmap Phase 0, compare Drizzle with direct SQLite. No installation,
runtime database test, schema implementation, or performance benchmark was done.

## Recommendation

Start ARTHIKA's MVP with SDK-matched `expo-sqlite`, handwritten versioned
migrations, and small typed repositories. Keep financial rules outside SQL and
screens, as specified in [ARCHITECTURE.md](./ARCHITECTURE.md).

This is a project-fit judgement: the current priority is learning native
persistence through small slices with few dependencies. It is not a finding
that Drizzle is incompatible or inherently slower.

## Comparison

| Concern | Direct Expo SQLite | Drizzle over Expo SQLite |
| --- | --- | --- |
| Query authoring | Parameterized SQL; explicit row types | Typed schema and query builder; inferred query shapes |
| Migrations | Write and review SQL; implement version runner | Generate SQL with Drizzle Kit; bundle and apply it in the app |
| Additional setup | SQLite dependency and initialization | ORM, migration tooling, and documented SQL/Babel/Metro configuration |
| UI refresh | Explicit refresh/state handling in our application layer | Optional live-query hooks |
| Main learning cost | SQL, migrations, native lifecycle, concurrency | Those database concepts plus ORM/schema/tooling concepts |
| Main trade-off | More manual query/type maintenance | More tooling and an additional API/version surface |

Drizzle's official [Expo integration guide](https://orm.drizzle.team/docs/sqlite/connect-expo-sqlite)
documents its driver, migration bundling, and live queries. Its
[getting-started guide](https://orm.drizzle.team/docs/get-started/expo-new)
currently uses release-candidate ORM/Kit packages. Do not copy an unpinned
`expo-sqlite@next` example over this project's SDK-aware installation rule.
If selected later, choose and verify compatible package versions deliberately.

## Correctness and platform boundaries

Neither option replaces the requirements in [DATABASE.md](./DATABASE.md):
integer minor units, database constraints, atomic financial operations, preserved
history, and explicit migrations. Type inference is not runtime input validation.

Expo documents async queries and initialization through React context, and a
versioned migration example. It also documents web WASM/header setup and
transaction/foreign-key caveats. Those remain requirements with either approach;
adding an ORM does not by itself solve the browser setup.
See the [SDK 58 reference](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/)
and [our compatibility review](./SQLITE-COMPATIBILITY.md).

The inspected [Drizzle Expo session source](https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/expo-sqlite/session.ts)
uses synchronous transaction callbacks and commits after their return. Do not
assume an async callback has awaited rollback semantics. This source inspection
is not validation of an installed release; recheck the selected version if
Drizzle is adopted.

For direct SQLite, evaluate one controlled database access boundary so unrelated
queries cannot join another operation's transaction. Test foreign keys,
concurrency, and forced rollback before using it for financial writes. Keep
transactions short and avoid unrelated asynchronous work inside them.

## Trade-offs we would accept

We would maintain SQL migrations and repository return types ourselves, review
SQL against those types, and explicitly refresh affected UI after writes.
Tests must catch discrepancies; generic TypeScript annotations do not validate
database rows. Repositories limit the places that need changing if the query
layer changes later, but switching to an ORM would still require real work.

Revisit Drizzle if query/schema maintenance becomes a demonstrated burden.
Its migration generation and inferred types are meaningful advantages, not
features the MVP is forbidden to use.

## Proposed next implementation subtask

After approval: **Phase 3.1 — SQLite initialization and migration infrastructure**.

- Install SQLite using `npx expo install expo-sqlite`.
- Add connection/bootstrap, a versioned migration runner, and controlled access
  modules under a new `src/database/` folder.
- Integrate readiness/error handling in the existing root layout.
- Configure WASM and headers for a real database-backed web preview; do not
  silently substitute in-memory storage.
- Verify initialization, repeated migration execution, bound queries, foreign
  keys, rollback, and persistence with an isolated test database. Report native
  checks as pending when no Android runtime is available.

Expected files: package manifest/lockfile, new database modules and Metro config,
root layout, and progress notes. Do not create all product tables, source CRUD,
expense persistence, transfers, or EMI features in this subtask.

Learning focus: native database lifecycle, React context, async initialization,
migrations, transactions, and the difference between transient UI state and
durable data.

## Verification for this review

TypeScript passes. Lint is blocked because ESLint is not configured; its setup
prompt was declined. No package or application-code changes were retained.
