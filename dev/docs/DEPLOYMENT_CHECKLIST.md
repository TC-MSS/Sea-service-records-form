# Deployment and Acceptance-Test Checklist — v0.7.0

v0.7.0 changes **production** (`index.html`, `js/app.js`) as well as `dev/`. Keep the backup tag until sign-off.

## A. Pre-deployment

- [ ] Backup tag of `main` exists: `backup-before-v0.7.0` (INSTALL.md step 1).
- [ ] Work is on branch `v0.7.0`, not `main`.
- [ ] `node dev/tools/check-syntax.mjs .` — "All syntax checks passed."
- [ ] `node dev/tools/check-deps.mjs .` — "All local references resolve. OK".
- [ ] `cd dev && node --test tests/model.test.mjs tests/tp2293.test.mjs` — **40/40** pass.
- [ ] `cd dev && node tests/smoke.mjs` — **34/34** pass.
- [ ] Pull request **Files changed: 25** — 2 production files (`index.html`, `js/app.js`) and 23 under `dev/` (1 new: `dev/js/printView.js`). No other root file. No deletions.

## B. Deployment

- [ ] Pull request merged; **Actions → pages build and deployment** has a green check.
- [ ] `…/index.html`, `…/dev/index.html`, `…/dev/examiner.html` open after **Ctrl+F5** with no red errors in the console (F12) and no 404s.

## C. Acceptance tests — production candidate page (`index.html`)

| # | Test | Expected | Pass |
|---|---|---|---|
| P1 | Open `index.html`, EN then FR | "Given Name" / "Prénom"; title has no "development" | ☐ |
| P2 | Look above the table and above the summary | Two boxes: "UNVETTED SEA SERVICE — SUBJECT TO EXAMINER REVIEW" and "Service en mer non vérifié — sous réserve de l’examen par l’examinateur" | ☐ |
| P3 | Header after "S Days at sea, if different" | "T Converted days (unvetted)" | ☐ |
| P4 | Line: Mate, 8 h, 1 Jan → 31 Jan 2025 | R = 30, T = 30 (same as examiner page) | ☐ |
| P5 | Same line, watch 12 | T = 45; attestation warning in Findings | ☐ |
| P6 | Same line, days at sea 10 | T = 22; "days under way" warning | ☐ |
| P7 | Hover over a T value | Calculation explanation; same text in Findings under the table | ☐ |
| P8 | Summary | Total days on board, at sea, converted days + months (÷ 30), lines needing manual review, overlapping days | ☐ |
| P9 | Column K: tick Polar waters, type 12; type 20 in Acceptable ice service | Both ticked; summary "Polar waters 12", "Acceptable ice service 20" | ☐ |
| P10 | Column K: ice days greater than R | Error in Findings | ☐ |
| P11 | Column K: untick a condition | Its days are cleared | ☐ |
| P12 | **Save**, reload (F5) | Entries, ice days and T values come back | ☐ |
| P13 | Browser that used the old page (record under `SeaServiceRecord`) | Record loads, status "Your earlier record was loaded and converted…"; R recalculated (1–31 Jan = 30) | ☐ |
| P14 | DevTools › Application › Local Storage after Save | New key `SeaServiceRecord.v0.5.0.candidate`; `SeaServiceRecord` unchanged | ☐ |
| P15 | **Export JSON** | File `SeaServiceRecord-<CDN>-<date>.json` downloads | ☐ |
| P16 | **Import JSON** with that file in another browser | Same record and figures | ☐ |
| P17 | **Export PDF / Print** → Save as PDF | Landscape PDF: applicant info, all columns A–T, explanations, summary, unvetted label EN+FR, declaration | ☐ |
| P18 | Old sections | "Examiner Validation", "Examiner Review Summary", "Sea Service Assessment" no longer shown | ☐ |

## D. Acceptance tests — examiner review (`dev/examiner.html`)

| # | Test | Expected | Pass |
|---|---|---|---|
| E1 | Import the JSON exported in P15 | Same R and T as the candidate saw | ☐ |
| E2 | Applicant Information | No "Schema / record" / "Version / dossier"; exported JSON still contains `schemaVersion` and `recordId` | ☐ |
| E3 | Status "Accepted with adjustment", final days ≠ reference | Label "Adjustment reason (required)" in red, red border, red warning | ☐ |
| E4 | Type one letter in the reason | Red disappears at once; neutral "(required)" stays. Same in FR "(obligatoire)" | ☐ |
| E5 | Not reviewed line, no basis, type final days = T | Status becomes "Accepted"; notice "Status set automatically" | ☐ |
| E6 | Change final days to a different value | Status becomes "Accepted with adjustment"; reason requested (warning) | ☐ |
| E7 | Clear the final days | Status back to "Not reviewed"; counted 0 | ☐ |
| E8 | Final days on a line, no basis selected | "Reference days" shows T ("converted days"); no "select a basis" error | ☐ |
| E9 | Final days above T | Counted in total; summary total and difference change | ☐ |
| E10 | Status Rejected with final days 10 | Counted 0; warning | ☐ |
| E11 | Save with a missing reason | Draft saved (not blocked); "Lines missing an adjustment reason" = 1 | ☐ |
| E12 | Summary | Total final accepted days + months; difference from total converted days (− red / + green) | ☐ |
| E13 | Column K–O | Ice conditions shown with days, e.g. "Polar waters: 12 d" | ☐ |
| E14 | **Export PDF / Print** | PDF with lines, examiner review table, summary, comments | ☐ |
| E15 | Edge and Chrome | Same results | ☐ |

## E. Acceptance — development candidate (`dev/index.html`)

- [ ] Same behaviour as P1–P17 (title shows "development v0.7.0" and the dev banner).
- [ ] A record saved here appears in production `index.html` on the same browser (same key) and vice versa.

## F. Decisions

Confirmed for v0.7.0 (2026-11-25):

- [x] Production moves to the 0.5.0 schema under `SeaServiceRecord.v0.5.0.candidate`; the 0.4.0 key is read-only.
- [x] 4(d): final days on a Not reviewed line set the status automatically.
- [x] The unvetted calculation prints, with the EN/FR label.
- [x] Records stay in each person's browser; exchange by exported JSON; PDF through the browser's "Save as PDF".

Still to confirm (see CALCULATION_RULES.md §7): day count; rounding down; days-under-way method when S ≠ R; MPR s. 117 for Supernumerary Mate. Not implemented: pilot service, CAF rates, MOU Tables III–VI, training remission, certificate eligibility.

## G. Sign-off

| Role | Name | Date | Result |
|---|---|---|---|
| Developer | | | |
| Examiner (calculation and review rules) | | | |
| Bilingual review | | | |
| Production owner | | | |

## H. Rollback

Revert the merge commit (INSTALL.md "Undo"). The old page reads `SeaServiceRecord`, which v0.7.0 never overwrites. Entries saved only with v0.7.0 stay under `SeaServiceRecord.v0.5.0.candidate` and become visible again when v0.7.0 is restored. Candidates should keep their exported JSON files.
