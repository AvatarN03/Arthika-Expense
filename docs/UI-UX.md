# UI / UX Specification — ARTHIKA

## 1. Brand

**Name:** ARTHIKA.

The user selected ARTHIKA after comparing generated logo concepts and preferred its logo and colour treatment. The approved logo asset and its actual palette are the source of truth. Do not redraw or replace it without approval.

Brand feel: calm, trustworthy, modern, refined, clear, and useful for everyday money decisions.

Avoid generic fintech clichés, rainbow palettes, excessive gradients, glassmorphism, over-rounded controls, dense report layouts, and decorative motion.

## 2. Design system

Extract/sample actual colours from the approved ARTHIKA logo before defining tokens. Create semantic tokens for:
- Brand primary/supporting green tones.
- Background, surface, text, border.
- Positive, warning, destructive, informational states.
- Typography, spacing, radius, elevation.
- Icon sizing/stroke.
- Light/dark semantic mapping if both themes ship.

Use semantic tokens, not scattered hard-coded colours.

## 3. Navigation

Five proposed bottom tabs:
1. **Home** — overview, quick actions, commitments, recent activity.
2. **Sources** — bank, cash, wallets, source details, transfers, balance updates.
3. **Activity** — expenses, transfers, adjustments, history, filters.
4. **EMIs** — schedules, due dates, occurrence statuses.
5. **Settings** — privacy, app lock, notifications, backup, preferences.

Notification centre is reached from a Home bell icon, not a sixth tab. App lock appears outside normal navigation when authentication is required.

## 4. Home hierarchy

Proposed:
1. Greeting/product identity, privacy eye toggle, notification bell.
2. Total tracked balance across sources.
3. Spending for a clearly labelled period (current month proposed).
4. Upcoming commitments and available-after-commitments summary, with horizon explained.
5. Quick actions: Add Expense, Transfer, Update Balance.
6. Upcoming commitments.
7. Money sources preview.
8. Recent activity.

Home should answer: “Where is my money?”, “What needs attention soon?”, and “What can I do now?” It is not an analytics dashboard.

Do not finalise the available-after-commitments figure until its horizon is approved.

## 5. Core screens

- **Sources:** source list, name/type/tracked balance, add flow, detail/activity, update balance, archive behaviour.
- **Add expense:** prominent amount, category, source, editable date, optional description, clear save feedback, duplicate-submit protection.
- **Transfer:** from/to/amount/date/note; clear transfer semantics; distinct sources.
- **Activity:** chronological list; distinguish expense/transfer/adjustment; filters; detail explains balance impact.
- **Reconciliation:** previous tracked balance, entered actual amount, difference preview, optional reason, history explanation.
- **EMIs:** active overview, next due date/amount, statuses, detail/history, add/edit/pause/resume/complete, mark paid/link existing expense.
- **Settings:** privacy, lock/PIN/biometrics, timeout, notifications, backup/restore, theme/currency if supported, about.

## 6. Privacy mode

Eye toggle easy to reach from Home. When enabled, mask all amounts consistently. Keep non-sensitive labels visible where useful. Use shared formatter/component/state rather than screen-by-screen ad hoc masking.

## 7. App lock UX

Focused PIN setup and confirmation; biometric only when supported/enrolled; PIN fallback; clear recovery expectations; auto-lock options: immediately, 30 seconds, 1 minute, 5 minutes; manual lock. Do not reveal dashboard content behind lock.

## 8. Motion and components

Choose one coherent component foundation. Use animation selectively for navigation, sheets/dialogs, small balance transitions, and meaningful confirmations. Respect reduced-motion settings. Do not animate every card/list item.

## 9. Accessibility and layout

Design for common Android phone sizes first. Respect safe areas, system navigation, keyboard behaviour, readable contrast, touch targets, screen readers, and non-colour status cues.

## 10. Design approval

Build a small design-system foundation and one representative screen/flow for user review before expanding all screens. User reviews product UI and behaviour, not routine tests or internal documentation maintenance.
