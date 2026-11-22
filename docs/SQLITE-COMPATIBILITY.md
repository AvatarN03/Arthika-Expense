# Expo SQLite compatibility review

Reviewed: 2026-11-22. Scope: roadmap Phase 0 SQLite validation, before Phase 3.

This is the historical pre-installation review. SQLite 58.0.18 has since been
installed and the foundation implemented; see [current progress](./PROGRESS.md)
for actual test results and remaining native verification.

## Result

Documentation and local SDK metadata support proceeding with Expo SQLite.
**Runtime compatibility and persistence have not been tested.** This review did
not install packages, open a database, or change application code.

## Repository evidence

- The installed Expo version is `58.0.25`; React Native is `0.88.1`.
- Expo's local `bundledNativeModules.json` specifies `expo-sqlite: ~58.0.17`.
- The SDK 58 reference currently recommends `~58.0.18`. These patch ranges
  overlap; use `npx expo install expo-sqlite` rather than manually choosing a
  version when installation is approved.
- SQLite is absent from the project manifest, lockfile, and installed packages.
- No database, migration, or repository modules exist in the app yet.
- There is no custom Metro configuration. The existing web preview is UI-only.

## SDK documentation findings

- Standard SQLite supports Android/iOS and Expo Go, with restart persistence.
- Async queries, bound parameters, React context integration, and versioned
  migrations using `PRAGMA user_version` are available.
- Web needs WASM asset support and COOP/COEP headers for SharedArrayBuffer.
- `withExclusiveTransactionAsync` is unavailable on web. Its separate native
  connection does not inherit foreign-key settings; those cannot be enabled
  inside the transaction. Ordinary async transactions can include unrelated
  queries on the same connection.
- SQLCipher is not available in Expo Go; encryption needs a custom build.

Source: [SDK 58 SQLite reference](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/).

## Implications for ARTHIKA

The requirements in [DATABASE.md](./DATABASE.md) remain unchanged: integer minor
units, foreign-key enforcement, versioned migrations, and atomic multi-record
financial operations. Keep SQL outside screens.

During implementation, select a transaction strategy that preserves foreign
keys and controls concurrent access. Do not use exclusive transactions simply
because their name sounds safer. A serialized access boundary around ordinary
transactions is a candidate to evaluate, not an implemented or final decision.

Preserve laptop previews when adding persistence: configure and test the web
backend deliberately, or explicitly keep it preview-only. Never silently use
an in-memory substitute and describe it as durable storage. An app lock is not
equivalent to database encryption.

## Runtime acceptance checks for the implementation task

1. Install through Expo's SDK-aware installer and verify the resolved version.
2. Open an isolated test database on Android; test bound writes and reads.
3. Enable and inspect foreign-key enforcement; reject an invalid reference.
4. Force a multi-write failure; verify rollback and no unrelated-write capture.
5. Run a versioned migration twice; verify safe repeated initialization.
6. Restart the app and verify the earlier record remains.
7. If the web backend is enabled, verify browser isolation, reads/writes,
   rollback, and reload persistence separately from Android.

These are planned checks, not results. Do not create all product tables for
this smoke test.

## Checks and next subtask

TypeScript passes. Lint cannot run because ESLint is not configured; its setup
prompt was declined to keep this review free of dependency changes.

Next: compare direct Expo SQLite with Drizzle for this project. That choice is
still open, and database setup has not started.
