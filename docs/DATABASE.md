# Local Database Design — ARTHIKA

## 1. Persistence principles

- SQLite is the proposed local relational database.
- Financial data is the source of truth; UI state is not.
- Use database transactions for multi-record financial operations.
- Use migrations with explicit schema versions.
- Persist money in integer minor units where practical.
- Index common source/date/status queries.
- Never store a PIN in plain text.
- Keep SQL behind a small data-access/repository layer; screens should not contain raw SQL.

ORM choice (Drizzle vs direct SQLite) is open until validated against the selected Expo SDK.

## 2. Proposed entities

Conceptual schema only. Refine exact columns/types in the database phase; do not create every table in one task.

### `money_sources`
`id`, `name`, `type` (bank/cash/wallet), `opening_balance_minor`, `currency_code`, `is_archived`, `created_at`, `updated_at`.

### `transactions`
`id`, `type` (expense/transfer/adjustment), `amount_minor`, `source_id`, nullable `category_id`, nullable `description`, nullable `payment_method`, `occurred_at`, timestamps, optional void status, nullable `transfer_id`, nullable `emi_occurrence_id`.

### `transfers`
`id`, `from_source_id`, `to_source_id`, `amount_minor`, `occurred_at`, nullable `note`, timestamps. May be paired with ledger entries depending on chosen implementation.

### `categories`
`id`, `name`, `icon_key`, `sort_order`, `is_archived`; optional type for future income support.

### `emis`
`id`, `name`, `monthly_amount_minor`, `currency_code`, due schedule, `start_date`, nullable `end_date`, nullable `total_installments`, nullable `preferred_source_id`, nullable `payment_method`, nullable lender/notes, lifecycle status, reminder configuration, timestamps.

### `emi_occurrences`
`id`, `emi_id`, `due_date`, `amount_minor`, status, nullable `paid_at`, nullable `linked_transaction_id` (unique where present), timestamps. Enforce unique EMI/schedule occurrence identity.

### `reconciliations`
`id`, `source_id`, `previous_balance_minor`, `actual_balance_minor`, `difference_minor`, nullable reason, `created_at`, linked adjustment reference.

### `app_settings`
Typed settings or key/value settings for privacy, theme, notifications, lock enabled state/timeout, currency/locale. Raw PIN must not be stored here; secure credential material belongs in platform secure storage.

## 3. Constraints

- Expense references one source.
- Transfer references two different sources.
- EMI occurrence references one EMI.
- A paid occurrence links to at most one expense.
- An expense links to at most one EMI occurrence.
- Reconciliation references one source and one adjustment.
- Historical references remain valid after source archive.
- Transfer and EMI payment writes are atomic.
- Amounts are positive magnitudes; direction comes from type/relationship.
- Enable foreign-key enforcement.

## 4. Balance query strategy

Prefer deriving balances from opening balance plus ledger events, or use a controlled cached balance updated in the same transaction as each ledger event. Never let screens independently mutate cached balances. Provide recomputation/verification if caching is used.

## 5. Backup format

- Include schema version.
- Include all records needed to restore, preserving IDs and relationships.
- Validate before import.
- Use atomic/staged import.
- Exclude secrets such as PIN verification material.
- Define replace vs merge policy; do not guess.
- Version format for future migrations.

## 6. Sequence

1. Validate Expo SQLite and migration approach.
2. Create schema/migration foundation.
3. Implement source persistence.
4. Implement transaction persistence and balance queries.
5. Add atomic transfers.
6. Add reconciliation records.
7. Add EMI and occurrence persistence.
8. Add backup/restore after the data model stabilises.
