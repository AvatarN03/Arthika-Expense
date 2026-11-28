# <img src="assets/images/arthika-logo-horizontal-color.png" alt="ARTHIKA" width="560">

<p>
  <img src="assets/images/arthika-app-icon.png" alt="ARTHIKA app icon" width="128">
</p>

ARTHIKA is a local-first personal money management app built with React Native and Expo. It is designed to give one person a clear, trustworthy view of money held across banks, cash, and digital wallets.

The app tracks user-recorded balances rather than claiming to connect to or verify bank activity. It will help users:

- manage money sources such as bank accounts, cash, and wallets;
- record expenses and transfers;
- reconcile expected balances with amounts actually observed;
- track EMI commitments and link paid installments to expenses;
- see upcoming financial commitments and possible shortfalls;
- keep financial values private on shared screens; and
- back up and restore local data.

ARTHIKA is an offline-first MVP. It does not require a login, cloud account, bank integration, or AI service.

## Current progress

The app foundation and database infrastructure are implemented.

### Implemented

- Expo SDK 58 / React Native app with Expo Router
- Android-first navigation and responsive web preview
- Light and dark visual themes
- Home, Sources, Activity, EMIs, and Settings app routes
- Expo Native Tabs navigation
- Shared Expo SQLite connection for the app
- Serializable database access and atomic transactions
- Foreign-key initialization and native WAL configuration
- Versioned, transactional migration runner
- Database startup loading, error, and retry states
- Web SQLite support with cross-origin isolation configuration
- Money-source migration and repository
- Money-source validation, creation, listing, detail lookup, editing, and archive behavior
- Transaction migration and repository for expenses and debit/credit adjustments
- Pure balance calculation from opening balances and ledger entries
- Pure expense validation shared by the domain, repository, and expense form
- Expense creation persistence from the Add Expense form
- Void-and-reverse correction policy with an expense detail view
- Pure transfer domain rules and atomic dual-row transfer persistence
- Transfer form wired into Home
- Transfer activity display with source/destination resolution
- Pure reconciliation calculation (difference + adjustment direction)
- Atomic reconciliation/adjustment persistence with history
- Balance update flow (non-cash sources) via "Update balance" sheet
- Cash reconciliation flow with denomination helper via "Count cash" sheet
- Reconciliation history sheet per source with balance before/after and difference
- Activity screen annotation: reconciliation adjustments show "Balance reconciliation" with source name
- EMI schedule migration (schema v6) and repository (create, list, getById, updateDetails, setStatus)
- Database-backed Sources screen for listing, creating, and archiving sources
- Database-backed Home screen with live balances and recent activity
- Database-backed Activity screen with basic type filters
- Money input parsing and display formatting helpers
- Node/real-SQLite and domain tests plus web SQLite smoke checks

### In progress or not yet implemented

- EMI occurrence generation, status calculation, and UI (Phase 7.2+)
- Commitment and shortfall calculations
- Privacy masking
- PIN/biometric app lock
- Notifications
- Backup and restore

Sources, Home, and Activity now read and write the local database, and Add Expense and Transfer persist to the ledger. EMIs and Settings still contain representative or placeholder UI.

For the detailed product scope, see [PRD](docs/PRD.md) and [functional requirements](docs/FEATURES.md). For implementation status, see [progress](docs/PROGRESS.md) and [roadmap](docs/ROADMAP.md).

## Technology

- React Native 0.88
- React 19
- Expo SDK 58
- Expo Router
- Expo SQLite
- TypeScript
- ESLint
- Node.js test runner with real SQLite

The app uses direct Expo SQLite queries and a repository layer. The database implementation intentionally exposes a queued database client rather than a raw SQLite connection.

## Project structure

```text
src/
  app/                 Expo Router screens and tab layout
  components/         Shared UI and expense components
  constants/          Theme tokens
  database/           SQLite connection, migrations, and repositories
  domain/             Pure financial rules such as balance and expense validation
  hooks/              Shared React hooks
  lib/                Money input and display helpers
docs/                 Product, architecture, database, and roadmap documents
tests/                SQLite and money-source tests
scripts/              Development-only database smoke scripts
website/             Separate ARTHIKA landing-page prototype
assets/               App, logo, and splash assets
```

## Getting started

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npm start
```

Useful platform commands:

```bash
npm run android
npm run ios
npm run web
```

### Run checks

```bash
npm run typecheck
npm run lint
npm test
```

`npm test` runs both suites. Database tests use isolated real-SQLite databases and cover migrations, bindings, foreign keys, transactions, queued access, schema downgrade rejection, close/reopen behavior, WAL setup, money-source repository rules, transaction repository rules, ledger projection, ledger-to-balance integration, and full close/reopen restart persistence. Domain tests cover signed balance effects, per-source balances, per-currency totals, transfer pairing, validation, safe-integer overflow, money input/format helpers, and expense validation.

## Web development

```bash
npm run web
```

Expo can also run the web app by pressing `w` in an already-running Metro terminal.

SQLite web requires cross-origin isolation. The project configures the required COOP/COEP headers for development and web middleware. A deployed web server must send compatible headers; browser and native devices keep separate local databases.

Use browser DevTools device emulation to review mobile widths, especially 320, 390, and 768 pixels.

## Native verification

Android and iOS behavior should be verified with Expo Go, an emulator, or a development build after database and native-feature changes.

Native verification is currently outstanding. Node.js and browser SQLite checks verify much of the foundation, but they do not establish native restart behavior, mobile keyboard behavior, safe areas, tab icons, or back navigation.

## Database

The app owns one `arthika.db` connection. Screens must use the database provider and repository modules rather than opening or closing SQLite directly.

Database details and access rules are documented in [src/database/README.md](src/database/README.md). Product schemas and persistence rules are defined in [docs/DATABASE.md](docs/DATABASE.md).

## Documentation

- [Product requirements](docs/PRD.md)
- [Functional requirements](docs/FEATURES.md)
- [Domain model](docs/DOMAIN-MODEL.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database design](docs/DATABASE.md)
- [Implementation progress](docs/PROGRESS.md)
- [Implementation roadmap](docs/ROADMAP.md)
- [UI/UX direction](docs/UI-UX.md)
- [Agent workflow](docs/AGENT_WORKFLOW.md)

## Privacy and data ownership

ARTHIKA is local-first and displays manually tracked money, not live bank balances. Privacy mode and app lock are part of the planned MVP but are not implemented yet.

Until a backup system is added, users should understand that local data may be lost if the app is uninstalled or the device is lost or reset.

## Brand assets

- [Horizontal logo](assets/images/arthika-logo-horizontal-color.png)
- [Reversed horizontal logo](assets/images/arthika-logo-horizontal-reversed.png)
- [App symbol](assets/images/arthika-symbol-color.png)
- [App icon](assets/images/arthika-app-icon.png)
- [Additional PNG and SVG logo variants](assets/ARTHIKA-logos/)

## License

See [LICENSE](LICENSE).
