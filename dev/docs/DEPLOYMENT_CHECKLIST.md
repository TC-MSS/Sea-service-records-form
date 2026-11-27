# Deployment and Acceptance-Test Checklist — v1.0.0

v1.0.0 changes **production** `index.html` and shared modules in `dev/js` / `dev/css` loaded by it. No new or deleted files. Keep the backup tag until sign-off.

## A. Pre-deployment

- [ ] Backup tag `backup-before-v1.0.0` exists (INSTALL.md step 1).
- [ ] Work is on branch `v1.0.0`.
- [ ] `node dev/tools/check-syntax.mjs .` — "All syntax checks passed."
- [ ] `node dev/tools/check-deps.mjs .` — "All local references resolve. OK".
- [ ] `cd dev && node --test tests/model.test.mjs tests/tp2293.test.mjs` — **47/47** pass.
- [ ] `cd dev && node tests/smoke.mjs` — **44/44** pass.
- [ ] Pull request **Files changed: 23** — 1 root file (`index.html`) and 22 under `dev/`. No new files, no deletions. `js/app.js`, `dev/js/tp2293Engine.js`, `dev/js/storageEngine.js`, `dev/js/examinerReview.js`, `dev/js/referenceData.js` and `dev/css/candidate.css` must not appear.

## B. Deployment

- [ ] Pull request merged (purple **Merged** label — not just closed); **Actions → pages build and deployment** green.
- [ ] `…/index.html`, `…/dev/index.html`, `…/dev/examiner.html` open after **Ctrl+F5** with no red console errors and no 404s.

## C. Candidate pages (`index.html`, `dev/index.html`)

| # | Item | Test | Expected | Pass |
|---|---|---|---|---|
| C1 | 1 | Column M | Tick boxes Oil / Chemical / Gas transfer, each with a "days" box (like column K) | ☐ |
| C2 | 1 | Type days for a transfer type | The type is ticked automatically; unticking clears the days | ☐ |
| C3 | 1 | Tick two transfer types on one line | Both kept, each with its days | ☐ |
| C4 | 1 | Transfer days 50 on a 39-day line | Days box red, column R red, "More than days on board (39)"; red error in Findings (EN / FR) | ☐ |
| C5 | 1 | Click Export JSON / Export PDF | Blocked; "Export blocked" lists "Days of transfer operations exceed the days on board" | ☐ |
| C6 | 1 | Correct the days, or change the dates so R grows | Red and block disappear | ☐ |
| C7 | 1 | Ice days above R (v0.9.0) | Same behaviour as C4–C5 | ☐ |
| C8 | 1 | Transfer ticked, days blank | Allowed (warning only) | ☐ |
| C9 | 1 | Summary | "Transfer operations (days entered): Oil transfer n / Chemical transfer n / Gas transfer n" | ☐ |
| C10 | 4 | Browser with a record saved by v0.9.0 | Opens; the single transfer type is ticked with days blank | ☐ |

## D. Examiner (`dev/examiner.html`)

| # | Item | Test | Expected | Pass |
|---|---|---|---|---|
| D1 | 1 | Line with transfer days entered, line Accepted | "Automatic" = the candidate's transfer days (capped at the line's counted days), not the whole line | ☐ |
| D2 | 1 | Service ticked without days | Automatic = 0 | ☐ |
| D3 | 2 | Special service vetting table | Columns: Automatic, Review status, Adjusted days, Final accepted days, Reason | ☐ |
| D4 | 2 | Review status list | Accepted, Accepted with adjustment, Rejected (starts "Select a status") | ☐ |
| D5 | 2 | Accepted | Final accepted days = Automatic; adjusted days and reason disabled | ☐ |
| D6 | 2 | Accepted with adjustment | Adjusted days and reason enabled; Final accepted days = adjusted days; reason red until typed | ☐ |
| D7 | 2 | Adjusted days above the line's counted days | Red box, error; Final accepted days capped; **Save draft refused**; export refused | ☐ |
| D8 | 2 | Rejected | Final accepted days = 0 | ☐ |
| D9 | 2 | Export with a service without status | Blocked: "Line n: choose a review status for each special service."; the status box turns red | ☐ |
| D10 | 2 | Line itself Rejected | Service rows disabled and cleared; nothing required | ☐ |
| D11 | 3 | Summary heading | Exactly "Approved special service" / "Service spécialisé approuvé" (no "overlapping dates counted once") | ☐ |
| D12 | 2–3 | Summary list | Final figures; "(adjusted — automatic N)" when different | ☐ |
| D13 | 2–3 | Export PDF | Review table shows each service with status and figures; heading without the overlapping wording | ☐ |
| D14 | 2 | Export JSON | `serviceReview` per line with reviewStatus, automaticDays, finalAcceptedDays, effectiveDays | ☐ |
| D15 | 4 | Load an examiner draft saved with v0.9.0 that had service figures | Figures kept; statuses set (Accepted / Accepted with adjustment); conversion note on the line | ☐ |
| D16 | — | FR | All new labels and messages in French | ☐ |
| D17 | — | Edge and Chrome | Same results | ☐ |

## E. Decisions confirmed for v1.0.0 (2026-11-27)

- [x] Column M: several transfer types per line, each with optional days.
- [x] Ticked service without days → automatic 0.
- [x] Service statuses: Accepted / Accepted with adjustment / Rejected; mandatory before examiner export.
- [x] Records saved by v0.4–v0.9 keep loading without losing any figure.

Still to confirm: certificate acronyms (CALCULATION_RULES.md §7); passenger / fishing / DP / offshore vetting; open rules (§8).

## F. Sign-off

| Role | Name | Date | Result |
|---|---|---|---|
| Developer | | | |
| Examiner (review rules) | | | |
| Bilingual review | | | |
| Production owner | | | |

## G. Rollback

Revert the merge commit (INSTALL.md "Undo"). Storage keys unchanged. Records saved with v1.0.0 open in v0.9.0: the single transfer code is still written; per-service statuses are ignored there.
