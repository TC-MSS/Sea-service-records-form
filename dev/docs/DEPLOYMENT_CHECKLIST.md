# Deployment and Acceptance-Test Checklist — dev v0.5.0-dev.1

## A. Pre-deployment

- [ ] Package unzipped; only a new `dev/` folder is added to the repository (`git status` shows no modified production files).
- [ ] Work is on a branch, not `main`.
- [ ] `node dev/tools/check-syntax.mjs .` — all OK (the three quirks-mode warnings on production HTML are known).
- [ ] `node dev/tools/check-deps.mjs .` — “All local references resolve. OK”.
- [ ] `cd dev && node --test tests/model.test.mjs` — 15/15 pass.
- [ ] `cd dev && node tests/smoke.mjs` — 17/17 pass.

## B. Deployment

- [ ] Pull request reviewed; merged to `main`.
- [ ] GitHub Pages build completes (Actions tab / Settings › Pages).
- [ ] `…/index.html` still loads and behaves as before (production unchanged).
- [ ] `…/dev/examiner.html` loads; browser console shows no errors; no 404s in the Network tab.

## C. Acceptance tests (manual, in the browser)

| # | Test | Expected | Pass |
|---|---|---|---|
| 1 | Open `index.html`, enter two voyages (one with days at sea different), Save. Open `dev/examiner.html`, click **Load candidate record**. | Both lines shown; status says converted from 0.4.0. | ☐ |
| 2 | Look at the verification group of any line (EN). | “Capacity verified” and “Specialized service verified” visible. | ☐ |
| 3 | Switch to Français. | “Fonction vérifiée”, “Service spécialisé vérifié”; all labels in French; entered values kept. | ☐ |
| 4 | Look at the table header. | “T Converted days” immediately after “S Days at sea, if different”. | ☐ |
| 5 | Converted days cells and summary. | “Not calculated” / “Non calculé”. | ☐ |
| 6 | Each line has Review status, Examiner basis, Final accepted days, Adjustment reason, Examiner comments. | Present on every line, marked “Examiner only”. | ☐ |
| 7 | Open the Examiner basis list. | Days on board, Days at sea, Converted days, Manual determination. | ☐ |
| 8 | Basis = Days on board, Final = same value, Status = Accepted. | No error; Basis days shows the value. | ☐ |
| 9 | Change Final to a different value. | Adjustment reason turns red “(required)”; error shown; warning suggests “Accepted with adjustment”. | ☐ |
| 10 | Enter an adjustment reason. | Error clears. | ☐ |
| 11 | Basis = Manual determination with no reason. | Reason required. | ☐ |
| 12 | Basis = Converted days. | Basis days “Not calculated”; error asks for another basis. | ☐ |
| 13 | Status = Rejected with final > 0. | Error “must have 0 final accepted days”. | ☐ |
| 14 | Summary card values. | Total days on board, total days at sea, total converted days (Not calculated), total final accepted days (accepted lines only) shown separately. | ☐ |
| 15 | **Save examiner draft**, reload page, **Load examiner draft**. | All examiner entries restored. | ☐ |
| 16 | In DevTools › Application › Local Storage. | `SeaServiceRecord` unchanged; `SeaServiceRecord.v0.5.0` has `"convertedDays": null` on each line. | ☐ |
| 17 | **Import JSON** `dev/tests/fixtures/legacy-pre-0.4.json`. | Line 1: Capacity verified and Specialized service verified ticked (from positionVerified / seaServiceVerified); polar + ice and DP + offshore shown; tanker warning displayed. Line 2: 45 days on board retained. | ☐ |
| 18 | **Export JSON**. | File downloads; `schemaVersion` 0.5.0; `migration.legacyRecordFields` present for migrated records. | ☐ |
| 19 | **Print** preview. | Toolbar hidden; table and review panels readable. | ☐ |
| 20 | Test in Edge and Chrome (government standard browsers). | Same results. | ☐ |

## D. Sign-off

| Role | Name | Date | Result |
|---|---|---|---|
| Developer | | | |
| Examiner (functional) | | | |
| Bilingual review (FR terminology) | | | |

## E. Rollback

The package adds files only. To roll back, delete the `dev/` folder (or revert the merge commit). Production pages and saved candidate records are unaffected; examiner drafts under `SeaServiceRecord.v0.5.0` can be cleared from browser storage.

## F. Open items for the next increment

- French terminology review of “Fonction vérifiée”, “Accepté avec rajustement”, “Base de l’examinateur”, “Détermination manuelle”.
- Implement TP 2293 conversion rates (populate `calculation.convertedDays`, `conversionStatus = CALCULATED`).
- Certificate eligibility (MPR / TP 2293).
- Fix production defects listed in `DEPENDENCY_INVENTORY.md` §4 when the candidate form moves to the v0.5.0 model.
- Remove `js/1*.js`, `records.html`, `js/translations.js`, `js/voyageAssessmentEngine.js`, `js/tp2293Calculation.js` once agreed.
