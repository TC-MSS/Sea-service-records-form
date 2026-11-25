# Deployment and Acceptance-Test Checklist — dev v0.6.0-dev.1

## A. Pre-deployment

- [ ] A backup tag of `main` exists (for example `v0.5.0-dev`).
- [ ] Work is on a branch (for example `dev-v0.6.0`), not `main`.
- [ ] `node dev/tools/check-syntax.mjs .` — all OK.
- [ ] `node dev/tools/check-deps.mjs .` — "All local references resolve. OK".
- [ ] `cd dev && node --test tests/model.test.mjs tests/tp2293.test.mjs` — 34/34 pass.
- [ ] `cd dev && node tests/smoke.mjs` — 22/22 pass.
- [ ] Pull request **Files changed**: only `dev/...` files, plus `index.html` and `js/app.js` if the label patch is included. Each of those two production files should show only its label line(s) changed.

## B. Deployment

- [ ] Pull request merged; **Actions → pages build and deployment** shows a green check.
- [ ] `…/index.html` (production) works as before and shows "Given Name" (if patched).
- [ ] `…/dev/index.html` and `…/dev/examiner.html` load with no console errors and no 404s.

## C. Acceptance tests

| # | Test | Expected | Pass |
|---|---|---|---|
| 1 | Production `index.html`, EN then FR | Label "Given Name" / "Prénom" | ☐ |
| 2 | `dev/index.html` EN / FR | "Given Name" / "Prénom"; all labels translated | ☐ |
| 3 | Line: Mate, 8 h, 1 Jan → 31 Jan | R = 30, T = 30 | ☐ |
| 4 | Same line, watch 12 | T = 45; attestation warning shown | ☐ |
| 5 | Same line, days at sea 10 | T = 22 (min(2.25 × 10, 1.5 × 30)); "days under way" warning | ☐ |
| 6 | Watch 8, days at sea 25 | T = 30 (min(37.5, 30)) | ☐ |
| 7 | Capacity Deck Cadet, watch 12, no days at sea | T = 30; no attestation warning | ☐ |
| 8 | Capacity Supernumerary Mate, 8 h, 30 days | T = 20; 9-month warning | ☐ |
| 9 | Vessel type MOU, O = None | T = "Manual review" | ☐ |
| 10 | Vessel type MOU, O = DP | T calculated normally; MOU warning | ☐ |
| 11 | Vessel type Barge, deck capacity | T = "Manual review" | ☐ |
| 12 | Two lines with overlapping dates | Overlap warning on both; "Overlapping days" in summary | ☐ |
| 13 | Two lines where the discharge and next engagement are on the same date | No overlap warning | ☐ |
| 14 | Days at sea greater than days on board | T = "Error"; error message | ☐ |
| 15 | Summary | Total converted days and months (÷ 30) | ☐ |
| 16 | Hover over a T value | Calculation explanation shown | ☐ |
| 17 | **Save** on `dev/index.html`, then examiner **Load candidate record** | Same converted days in column T; calculation line under each review | ☐ |
| 18 | Examiner basis "Converted days" on a calculated line | Basis days = T value; final = T needs no reason | ☐ |
| 19 | Examiner basis "Converted days" on a manual-review line | Error asks for another basis | ☐ |
| 20 | Production record saved by `index.html` before this release | Loads in both dev pages; R recalculated under TP 2293 s. 3.3(4) | ☐ |
| 21 | DevTools › Local Storage | `SeaServiceRecord` unchanged by the dev pages | ☐ |
| 22 | Compare 5 real files already assessed by hand | Differences explained by the rules in `CALCULATION_RULES.md` | ☐ |
| 23 | Edge and Chrome | Same results | ☐ |

## D. Decisions to confirm (see CALCULATION_RULES.md §5)

- [ ] Day count: discharge − engagement (Table 1 (A))
- [ ] Round down to whole days
- [ ] Days-under-way method whenever S differs from R
- [ ] MPR s. 117 applied to "Supernumerary Mate"

## E. Sign-off

| Role | Name | Date | Result |
|---|---|---|---|
| Developer | | | |
| Examiner (calculation rules) | | | |
| Bilingual review | | | |

## F. Rollback

Revert the merge commit, or check out the backup tag. The dev pages only add browser storage keys and never change `SeaServiceRecord`.
