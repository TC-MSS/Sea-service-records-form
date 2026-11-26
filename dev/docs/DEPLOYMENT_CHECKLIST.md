# Deployment and Acceptance-Test Checklist — v0.8.0

v0.8.0 changes **production** `index.html` and the shared modules in `dev/js` and `dev/css`, which the production page loads. Keep the backup tag until sign-off.

## A. Pre-deployment

- [ ] Backup tag of `main` exists: `backup-before-v0.8.0` (INSTALL.md step 1).
- [ ] Work is on branch `v0.8.0`, not `main`.
- [ ] `node dev/tools/check-syntax.mjs .` — "All syntax checks passed."
- [ ] `node dev/tools/check-deps.mjs .` — "All local references resolve. OK".
- [ ] `cd dev && node --test tests/model.test.mjs tests/tp2293.test.mjs` — **38/38** pass.
- [ ] `cd dev && node tests/smoke.mjs` — **35/35** pass.
- [ ] Pull request **Files changed: 22** — 1 root file (`index.html`) and 21 under `dev/`. No new files, no deletions. `js/app.js`, `dev/js/tp2293Engine.js`, `dev/js/migrationEngine.js`, `dev/js/storageEngine.js` and `dev/css/candidate.css` must **not** appear.

## B. Deployment

- [ ] Pull request merged; **Actions → pages build and deployment** has a green check.
- [ ] `…/index.html`, `…/dev/index.html`, `…/dev/examiner.html` open after **Ctrl+F5** with no red console errors (F12) and no 404s.

## C. Acceptance tests — candidate pages (`index.html` and `dev/index.html`)

| # | Item | Test | Expected | Pass |
|---|---|---|---|---|
| C1 | 1 | Column A list, EN | "Mate in Charge of a Watch" (Supernumerary Mate unchanged) | ☐ |
| C2 | 1 | Same, FR | "Officier de pont en charge du quart à la passerelle" | ☐ |
| C3 | 1 | Record saved before v0.8.0 with capacity Mate | Shows the new label; T unchanged | ☐ |
| C4 | 2 | Declaration unticked | Caution "Mandatory: tick the Applicant Declaration before you can Export JSON or Export PDF / Print." under the declaration | ☐ |
| C5 | 2 | Click **Export JSON** while unticked | No file downloads; message "Export blocked…"; declaration box turns red | ☐ |
| C6 | 2 | Click **Export PDF / Print** while unticked | Print window does not open; same message | ☐ |
| C7 | 2 | Press **Ctrl+P** while unticked | Printed page shows only the caution ("cannot be printed…") | ☐ |
| C8 | 2 | Tick the declaration | Caution and red box disappear; Export JSON and Export PDF work | ☐ |
| C9 | 2 | **Save** while unticked | Still allowed (record kept in the browser) | ☐ |
| C10 | — | FR | Caution and message in French | ☐ |

## D. Acceptance tests — examiner review (`dev/examiner.html`)

| # | Item | Test | Expected | Pass |
|---|---|---|---|---|
| D1 | 4 | Review panel | No "Examiner basis" field; "Converted days (reference)" shows column T | ☐ |
| D2 | 3 | Review status list | Choices: Accepted, Accepted with adjustment, Additional information required, Rejected. A new line shows "Select a status"; "Not reviewed" cannot be selected | ☐ |
| D3 | 3 | New line | Final accepted days disabled; counted 0 | ☐ |
| D4 | 3 | Accepted | Final days disabled (shows T as a hint); counted = T | ☐ |
| D5 | 3 | Accepted with adjustment | Final days enabled; counted = final days; reason "(required)" red until typed | ☐ |
| D6 | 3 | Additional information required | Final days enabled; counted = final days if entered, else 0; reason needed only if final ≠ T | ☐ |
| D7 | 3 | Rejected (after typing final days) | Final days cleared and disabled; counted 0 | ☐ |
| D8 | 3 | Accepted on a "Manual review" line | Counted 0 + warning to use Accepted with adjustment | ☐ |
| D9 | 5 | Summary › Examiner determination | **Total final accepted days: N (months)** in bold, followed by **Certificate applied for: …** in bold | ☐ |
| D10 | 6 | Same card | Only: total + certificate, difference from total converted days, Additional information required, Approved special service. No "Lines …", Accepted, Accepted with adjustment or Rejected counts | ☐ |
| D11 | 6 | Special service list | One row per service selected on any line (ice, transfer, passenger, fishing, DP, offshore) with approved days | ☐ |
| D12 | 6 | Two lines with oil transfer, dates overlapping 10 days, both Accepted (30 and 20 days) | Oil transfer = 40 | ☐ |
| D13 | 6 | Polar waters ticked with 40 days on a 30-day accepted line | Polar waters = 30 (capped) | ☐ |
| D14 | — | Load an examiner draft saved with v0.7.0 (Accepted, final ≠ T) | Opens as "Accepted with adjustment", final days kept, conversion warning on the line | ☐ |
| D15 | 5–6 | **Export PDF / Print** | Total and certificate in bold; special-service table; no basis column | ☐ |
| D16 | — | FR | Labels, certificate and special services in French | ☐ |
| D17 | — | Edge and Chrome | Same results | ☐ |

## E. Decisions confirmed for v0.8.0 (2026-11-26)

- [x] Special-service totals: overlapping dates within a service counted once.
- [x] Ice approved days = candidate's entered days, limited to the line's approved days.
- [x] Accepted = converted days; Accepted with adjustment = final days; Additional information required = final days if entered, else 0; Rejected = 0. "Not reviewed" removed from the choices; automatic status removed.
- [x] Declaration required only for Export JSON and Export PDF / Print (Save allowed; no automatic untick).

Still to confirm (CALCULATION_RULES.md §7): day count; rounding down; days-under-way method when S ≠ R; MPR s. 117 for Supernumerary Mate. Not implemented: pilot service, CAF rates, MOU Tables III–VI, training remission, certificate eligibility.

## F. Sign-off

| Role | Name | Date | Result |
|---|---|---|---|
| Developer | | | |
| Examiner (review rules) | | | |
| Bilingual review | | | |
| Production owner | | | |

## G. Rollback

Revert the merge commit (INSTALL.md "Undo"). Storage keys are unchanged in v0.8.0. Examiner drafts saved with v0.8.0 open in v0.7.0 (the basis is "None", so v0.7.0 compares with converted days).
