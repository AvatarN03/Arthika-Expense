# Functional Requirements — ARTHIKA

## 1. Money sources

A source is a place where the user holds funds: bank account, physical cash, or digital wallet. It is not an income category or payment method.

- Create a source with name, type, opening tracked balance, and currency.
- Edit name and non-financial details.
- Display tracked balance and recent activity.
- Provide a manual “Update Balance” action.
- Preserve history if a source is archived or deactivated.
- Never silently delete financial history or leave dangling references.

## 2. Expenses

Fields: positive amount, category, optional description, date/time, money source, optional payment-method metadata, timestamps.

- Add an expense quickly.
- Select the source from which money was spent.
- Edit or void according to an explicitly chosen audit policy.
- Show in Activity and source detail.
- Filter by date, category, and source.
- Exclude transfers and balance adjustments from expense totals.
- Validate before saving and prevent duplicate submissions.

## 3. Transfers

A transfer moves money between two sources owned by the user.

- Select distinct source and destination.
- Enter amount, date/time, optional note.
- Decrease source and increase destination.
- Do not count as expense or income.
- Represent both sides as one logical transfer.
- Persist atomically: both effects succeed or neither does.
- Editing/reversing must preserve consistency.

## 4. Manual balance update

The user checks a bank app, wallet, or cash and enters the actual amount they see.

- Show the current tracked balance.
- Accept the actual observed balance and optional reason.
- Calculate and preview the difference.
- Record previous tracked balance, entered balance, difference, timestamp, and reason.
- Do not rewrite opening balance or previous transactions.
- Show adjustment history.
- Describe the entered amount as user-provided, not independently verified.

`difference = entered actual balance - previous tracked balance`

## 5. Cash reconciliation

- Show expected/tracked cash.
- Let the user enter physical cash counted.
- Preview difference before confirmation.
- Optionally capture a reason.
- Record as an adjustment with history.
- Do not fabricate individual expenses to force the ledger to match.

## 6. EMI management

### EMI definition
- Name (e.g. Laptop EMI).
- Monthly amount.
- Due day/date rule.
- Start date.
- Optional end date or total installment count.
- Preferred money source.
- Payment method (UPI, bank transfer, cash, etc.).
- Optional lender/provider and notes.
- Reminder preferences.
- Lifecycle: active, paused, completed.

Payment method and money source are distinct: UPI can be the payment method while a bank account is the source.

### Occurrences
Statuses: Upcoming, Due today, Paid, Overdue, Skipped.

- Generate occurrences according to schedule.
- Show next due date and amount.
- Pause/completion stops future occurrences/reminders.
- Resume without duplicating history.
- Schedule edits preserve paid history and handle unpaid future occurrences deliberately.
- Paid occurrences are excluded from upcoming commitments.
- Repeated generation must not create duplicates.
- If variable installment amounts are not in MVP, state that limitation.

### Paying an installment
- Marking paid creates or links exactly one expense.
- If already manually recorded, allow linking the existing expense.
- Never create a duplicate.
- Prefill amount/source from EMI but confirm before saving.
- Save occurrence and transaction linkage atomically.
- Corrections/reversals must keep ledger and occurrence consistent.

## 7. Commitments and shortfall warnings

- Show upcoming EMI commitments by due date.
- Group by preferred source where useful.
- Warn when a source's tracked balance may not cover upcoming obligations.
- Example: tracked balance ₹1,500; EMI ₹2,000; potential shortfall ₹500.
- Combine multiple obligations in the chosen horizon without counting paid occurrences.
- Show tracked balance separately from available-after-commitments.
- Explain the horizon.
- Do not treat future commitments as already deducted.
- If no preferred source is assigned, do not silently allocate to an arbitrary source.

The default horizon is unresolved. Do not invent one in code; ask for approval when implementing this metric.

## 8. Notifications

Local notifications only in MVP.

- Proposed EMI reminders: 3 days before, 1 day before, and due date.
- Allow configuration/disable.
- Reschedule/cancel when EMI changes, pauses, or completes.
- Avoid duplicate notifications.
- Optional shortfall, cash-reconciliation, and daily logging reminders.
- Central notification service, not scheduling logic inside each screen.
- Explain that notifications cannot observe bank activity or unrecorded deductions and depend on device permission/OS scheduling.

## 9. Privacy mode

Global eye toggle on Home, persisted across restarts. Mask all amounts consistently across:
- Home, sources, source detail.
- Activity, expenses, transfers, adjustments.
- EMIs, commitments, reconciliation.
- Summaries and charts.

Use a consistent mask such as `••••••`. Keep useful non-sensitive labels visible. Use shared state/formatter so every screen behaves consistently. Privacy mode is not encryption.

## 10. App lock

- Optional 4- or 6-digit PIN setup and confirmation.
- Change/disable PIN after authentication.
- Optional biometric unlock where supported.
- PIN fallback.
- Auto-lock: immediately, 30 seconds, 1 minute, 5 minutes.
- Manual lock.
- Re-lock on background/resume according to policy.
- Never store plain-text PIN.
- Use secure platform storage and OS authentication APIs.
- Handle unavailable biometrics gracefully.
- Avoid exposing dashboard content behind lock screen.

## 11. Home

Proposed hierarchy:
- Greeting / “Your money”.
- Privacy toggle and notification entry.
- Total tracked balance across sources.
- Spending for a defined period (current month proposed).
- Upcoming committed amount for a defined horizon.
- Available after commitments, with horizon explained.
- Quick actions: Add Expense, Transfer, Update Balance.
- Upcoming commitments.
- Money sources preview.
- Recent activity.

Keep it an everyday utility, not a reporting dashboard. Do not implement the available-after-commitments metric until its horizon is approved.

## 12. Backup and restore

- Local export/backup.
- Versioned format and validation.
- Restore with explicit replace/merge policy.
- Validate before import.
- Avoid partial import; use transaction or staging.
- Warn before replacing existing data.
- No server upload in MVP.
- Do not export PIN secrets.

## 13. Settings

Privacy, app lock/biometrics, notifications, theme/currency preferences if supported, backup/restore, about and local-data explanation.

## 14. AI (later)

AI is optional and not required for MVP. It must never be required for core money operations. Future ideas include natural-language expense entry or summaries. Any AI feature must be opt-in and transparent about data sharing.
