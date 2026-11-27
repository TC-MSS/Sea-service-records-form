# Deployment and Acceptance-Test Checklist — v0.9.0

v0.9.0 changes **production** `index.html` and shared modules in `dev/js` / `dev/css` loaded by it, and adds two shared modules (`dev/js/recordRules.js`, `dev/js/serviceVetting.js`). Keep the backup tag until sign-off.

## A. Pre-deployment

- [ ] Backup tag `backup-before-v0.9.0` exists (INSTALL.md step 1).
- [ ] Work is on branch `v0.9.0`.
- [ ] `node dev/tools/check-syntax.mjs .` — "All syntax checks passed."
- [ ] `node dev/tools/check-deps.mjs .` — "All local references resolve. OK".
- [ ] `cd dev && node --test tests/model.test.mjs tests/tp2293.test.mjs` — **44/44** pass.
- [ ] `cd dev && node tests/smoke.mjs` — **43/43** pass.
- [ ] Pull request **Files changed: 25** — 1 root file (`index.html`), 24 under `dev/` of which **2 new** (`dev/js/recordRules.js`, `dev/js/serviceVetting.js`). No deletions. `js/app.js` and `dev/js/tp2293Engine.js` must not appear.

## B. Deployment

- [ ] Pull request merged; **Actions → pages build and deployment** green.
- [ ] `…/index.html`, `…/dev/index.html`, `…/dev/examiner.html` open after **Ctrl+F5** with no red console errors and no 404s.

## C. Candidate pages (`index.html`, `dev/index.html`)

| # | Item | Test | Expected | Pass |
|---|---|---|---|---|
| C1 | 6 | Look under the export buttons | Blue reminder: saved only in this browser; send to the local Transport Canada Centre examiner the JSON file, discharge book entries and testimonials (EN / FR) | ☐ |
| C2 | 8 | Column H list | "Near Coastal, Class 1 / 2" (FR "À proximité du littoral, classe 1 / 2") | ☐ |
| C3 | 11 | New record | Application date = today; can be changed | ☐ |
| C4 | 7 | Certificate deck (e.g. Master 500 GT NC) | Header * on A B C D G H I J P Q S | ☐ |
| C5 | 7 | Certificate engine (e.g. Second-class Engineer, Motor) | Header * on A B C D E I J P Q S (not G, H) | ☐ |
| C6 | 7 | Leave S (Days at sea) blank, click Export JSON | Blocked; list "Line n: mandatory field(s) missing — S"; S outlined red; red clears when filled | ☐ |
| C7 | 7 | No certificate / no surname / no CDN | Blocked with the matching message | ☐ |
| C8 | 3 | Ice days 45 on a 39-day line | Ice box red, column R red, "More than days on board (39)"; Export blocked; clears when corrected | ☐ |
| C9 | 3 | Ice condition ticked, days blank | Allowed (warning only in Findings) | ☐ |
| C10 | 2 | Declaration unticked | Export blocked (v0.8.0 behaviour kept) | ☐ |
| C11 | 9 | Export JSON when complete | File `CDN - SURNAME - UNVETTED QUALIFYING SEA SERVICE - M500NC - TOTAL OF X DAYS FROM … TO ….json` | ☐ |
| C12 | 9 | Export PDF → Save as PDF | Suggested file name identical (without .json) | ☐ |
| C13 | — | Save while incomplete | Allowed | ☐ |

## D. Examiner (`dev/examiner.html`)

| # | Item | Test | Expected | Pass |
|---|---|---|---|---|
| D1 | 1 | Line with Polar waters / Acceptable ice / transfer operation | "Special service vetting" table: Automatic, Final accepted days, Reason per service | ☐ |
| D2 | 1 | Line without those services | No vetting table | ☐ |
| D3 | 1 | Status Rejected or not chosen | Service inputs disabled and cleared | ☐ |
| D4 | 1 | Final service days above the line's counted days | Red box, error message; **Save draft refused** ("Not saved…"); Export refused | ☐ |
| D5 | 1 | Final service days different from automatic | Reason box red until typed (warning) | ☐ |
| D6 | 2 | Summary › Approved special service | Adjusted service shows **final** (adjusted — automatic N); others unchanged | ☐ |
| D7 | 2 | Export JSON | `serviceReview` per line with automaticDays and finalAcceptedDays; summary has both totals | ☐ |
| D8 | 10 | Click Export with name blank / a line without status / a verification box unticked | Blocked with a list; examiner name, status and unticked boxes highlighted in red | ☐ |
| D9 | 11 | Review date | Shows today, read-only; saved in `examinerAssessment.reviewDate` | ☐ |
| D10 | 9 | Export JSON / PDF when complete | `CDN - SURNAME - VETTED QUALIFYING SEA SERVICE - ACRONYM - TOTAL OF X DAYS FROM … TO …` with X = total final accepted days | ☐ |
| D11 | 1–2 | PDF | Review table has a "Special service vetting" column (automatic → final, reason); summary shows the adjusted note; examiner name and review date | ☐ |
| D12 | — | FR | All new labels and messages in French | ☐ |
| D13 | — | Edge and Chrome | Same results | ☐ |

## E. Decisions confirmed for v0.9.0 (2026-11-27)

- [x] One reason per adjusted service.
- [x] Service figure above the line's counted days = error, capped; saving and exporting refused until corrected.
- [x] Candidate ice days optional; a value above days on board must be corrected before export.
- [x] Summary layout: final figure with "(adjusted — automatic N)".
- [x] Days at sea mandatory (always a number).
- [x] File names: candidate UNVETTED with total converted days; examiner VETTED with total final accepted days; dates = earliest engagement to latest discharge.
- [x] Examiner: five verification boxes and a status on every line, and the examiner name, before export.
- [x] Older records: not required for this release (existing conversion kept); ask again next version.

To confirm: certificate acronyms (CALCULATION_RULES.md §7); open rules in §8.

## F. Sign-off

| Role | Name | Date | Result |
|---|---|---|---|
| Developer | | | |
| Examiner (review rules) | | | |
| Bilingual review | | | |
| Production owner | | | |

## G. Rollback

Revert the merge commit (INSTALL.md "Undo"). Storage keys unchanged. Records saved with v0.9.0 open in v0.8.0 (the extra `serviceReview` data is ignored there).
