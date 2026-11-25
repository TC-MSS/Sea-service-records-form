# Sea Service Records Form — Development package v0.6.0-dev.1

Development build with **automated sea service calculation** under TP 2293 Chapter 3 and the Marine Personnel Regulations (ss. 115–117).
Everything lives under `dev/`. The production pages (`index.html`, `examiner.html`) keep working. The only production change offered is the optional "Given Name / Prénom" label patch (see `../INSTALL.md`).

## Pages

| Page | Purpose |
|---|---|
| `dev/index.html` | Candidate form (new). Calculates days on board (R) and converted days (T) as the candidate types, with explanations and findings. |
| `dev/examiner.html` | Examiner review. Column T and the summary now show calculated days and months, with the calculation and its legal references on each line. |

## What changed in v0.6.0

- **Labels:** "Given Names" → **"Given Name"**, "Prénoms" → **"Prénom"**. The data field name `givenNames` is unchanged, so saved records still load.
- **New engine `js/tp2293Engine.js`.** Rules R1–R8 and the manual-review cases are listed in `docs/CALCULATION_RULES.md`.
- **Days on board** now follow TP 2293 s. 3.3(4): the engagement and discharge days together count as one day.
- **Converted days** are calculated for every line. A line that cannot be calculated shows "Manual review", "Not calculated" or "Error" and is stored as `null`.
- **Examiner basis "Converted days"** can now be used whenever the line was calculated.
- **Summary** adds converted months (÷ 30), lines needing manual review, overlapping days and the junior-officer excess.
- **New candidate form** (`dev/index.html`) on the v0.5.0 data model.

## Storage keys (browser)

| Key | Written by | Read by |
|---|---|---|
| `SeaServiceRecord` (0.4.0) | production `index.html` | dev pages, read-only (migrated in memory) |
| `SeaServiceRecord.v0.5.0.candidate` | `dev/index.html` | `dev/index.html`; examiner "Load candidate record" (checked first) |
| `SeaServiceRecord.v0.5.0` | `dev/examiner.html` (examiner draft) | `dev/examiner.html` |

The dev pages never write to the production key.

## Checks (from `dev/`, Node 20+)

```
node tools/check-syntax.mjs ..
node tools/check-deps.mjs ..
node --test tests/model.test.mjs tests/tp2293.test.mjs     # 34 unit tests
npm i -D playwright && npx playwright install chromium
node tests/smoke.mjs                                       # 22 browser smoke tests
```

`npm test` runs all of them. The latest results are in `docs/TEST_RESULTS.txt`.

## Files

| File | Status in v0.6.0 |
|---|---|
| index.html | **new** — candidate form |
| examiner.html | revised — v0.6.0 titles, calculation line, summary items, Given Name |
| css/candidate.css | **new** |
| css/examiner.css | revised — calculation styles |
| js/tp2293Engine.js | **new** — conversion rules |
| js/candidate.js | **new** — candidate form controller |
| js/calculationEngine.js | revised — TP 2293 day count, `recalculateVoyages()` |
| js/migrationEngine.js | revised — recalculates after migration |
| js/summaryEngine.js | revised — engine totals, months |
| js/validationEngine.js | revised — calculation warnings shown on lines |
| js/storageEngine.js | revised — candidate key |
| js/examiner.js | revised — calculated values and explanations |
| js/examinerI18n.js | revised — Given Name / Prénom; calculation and candidate text (EN/FR) |
| js/dataModel.js | revised — app version 0.6.0-dev.1; `convertedDaysExact`, `overlaps` |
| js/examinerReview.js, js/referenceData.js | unchanged |
| tests/tp2293.test.mjs | **new** |
| tests/model.test.mjs, tests/smoke.mjs | revised |
| docs/CALCULATION_RULES.md | **new** |
| docs/DEPLOYMENT_CHECKLIST.md, docs/DEPENDENCY_INVENTORY.md, docs/TEST_RESULTS.txt | revised |
