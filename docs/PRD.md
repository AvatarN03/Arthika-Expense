# Product Requirements Document — ARTHIKA

## 1. Product summary

ARTHIKA is a local-first personal money management application. It gives an individual a clear view of money held across different places, records spending and transfers, supports manual balance reconciliation, and accounts for upcoming recurring commitments such as EMIs.

The first release requires no account, cloud service, or automatic bank integration. The user maintains their own records and can use the app offline.

## 2. Problem

People keep money in several places: bank accounts, physical cash, and digital wallets. They may withdraw cash, spend it in several small transactions, and later lose track of what should remain. Upcoming EMIs or other commitments also mean that some money is effectively reserved before payment.

A basic expense list does not fully solve this. Users need to understand:
- How much money is tracked in each source and in total?
- What have I spent?
- Have I moved money between my own sources?
- Does the actual bank/cash balance match my records?
- What payments are coming up?
- After near-term commitments, how much remains available?

## 3. Goal

Make everyday personal money management clear, quick, and trustworthy.

### Primary goals
1. Track money across user-defined sources.
2. Record expenses with minimal friction.
3. Record transfers without inflating expense totals.
4. Reconcile tracked balances while preserving history.
5. Track recurring EMI obligations and payment status.
6. Warn about possible shortfalls before upcoming obligations.
7. Protect private financial information with privacy mode and app lock.
8. Keep the first release offline-capable without registration.

### Non-goals for MVP
- Automatic bank, card, UPI, or wallet synchronization.
- Login, cloud accounts, or multi-device synchronization.
- Shared expenses, groups, settlements, invitations, or participants.
- Full accounting, tax, investment, or loan-amortization tools.
- Mandatory AI.
- A complex income-management module. Income may be considered later but is not the central workflow.

## 4. Target user and use cases

An individual who manually tracks money across multiple sources and wants to avoid losing track of cash, spending, and upcoming commitments.

- Add a bank account, cash source, or wallet with an opening tracked balance.
- Record an expense against the source used.
- Transfer money between owned sources.
- Update a source after checking its actual balance.
- Compare expected cash with physical cash.
- Register an EMI and see due dates.
- Mark an EMI paid, creating or linking exactly one expense.
- See whether an upcoming commitment may exceed the tracked balance of its preferred source.
- Hide monetary values when someone else can see the screen.
- Require PIN or biometric authentication before app access.

## 5. Financial language

Use **tracked balance** for an amount calculated from user records. Never label it “live”, “verified”, or “real-time bank balance”.

Use **available after commitments** only when its calculation horizon is explicit. It is not the same as current tracked balance.

A transfer is movement between sources, not spending. An EMI schedule is a future obligation, not an expense until payment is recorded.

## 6. MVP scope

### P0 — required
- Local database and offline persistence.
- Money source creation/editing and safe archive/deletion behaviour.
- Expense creation, editing/correction policy, and history.
- Transfers between sources.
- Manual balance update with auditable adjustment.
- Cash reconciliation.
- EMI schedules and occurrences.
- EMI payment-to-expense linking without duplicates.
- Home overview with clear balance/commitment information.
- Global privacy mode.
- App lock with PIN and optional biometrics.
- Local notifications and EMI reminders.
- Local backup/export and restore strategy before release.

### P1 — after core workflows
- Custom categories.
- Custom reminder schedules.
- Optional daily expense reminder and cash reconciliation reminder.
- Search, filters, and date-range summaries.
- Charts only where they help a real decision.

### Later / not committed
AI assistance, cloud sync, login, income module, shared expenses, bank integrations.

## 7. Offline and data ownership

Core features must work without a network connection. The app must not depend on an external service to open, record an expense, transfer money, reconcile a source, or mark an EMI paid.

Because data is local-only initially, the app must explain that uninstalling or losing the device can cause data loss unless the user exports a backup. Backup/restore is a release requirement.

## 8. Trust, privacy, security

- Never imply bank connectivity where none exists.
- Explain that reminders cannot detect unrecorded bank deductions.
- Never store a plain-text PIN.
- Prefer platform secure storage and OS biometric authentication.
- Do not log PINs, financial amounts, or sensitive transaction details.
- Privacy mode is visual masking, not encryption.
- App lock is an access barrier, not a replacement for device security or database encryption.
- Destructive actions need clear confirmation.

## 9. Success criteria

A user can:
1. Create multiple sources and see correct tracked balances.
2. Record expenses and see the correct source balance/activity update.
3. Transfer internally without changing total tracked money or expense totals.
4. Reconcile a source without losing transaction history.
5. Register an EMI and identify potential shortfalls.
6. Mark an installment paid without duplicate expenses.
7. Use core flows offline.
8. Hide monetary values consistently.
9. Secure/unlock the app using configured authentication.
10. Export and restore local data.

## 10. Open product decisions

Resolve only when the relevant phase is reached:
- Default horizon for available-after-commitments.
- Variable EMI amounts in MVP or fixed monthly amount only.
- Handling a source deleted while historical transactions/active EMIs refer to it.
- Custom categories in MVP.
- Android-only or Android + iOS.
- Light theme in MVP.
