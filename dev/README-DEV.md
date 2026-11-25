# Sea Service Records Form — Development package v0.5.0-dev.1

Development build of the examiner review page on the v0.5.0 data model.
**Production files (`index.html`, `examiner.html`, `js/`, `css/`) are not modified.**
Everything new lives under `dev/`.

## What this build does

- `dev/examiner.html` shows **Capacity verified** / **Fonction vérifiée** and **Specialized service verified** / **Service spécialisé vérifié** directly in the page markup (no text-replacement script).
- Column **T Converted days / Jours convertis** follows **S Days at sea, if different**. It shows *Not calculated / Non calculé* and is stored as `null` (never 0).
- Examiner-only controls on every sea-service line: review status, examiner basis, final accepted days, adjustment reason, examiner comments (plus vessel / capacity / dates / specialized service / supporting-documents verification).
- Examiner basis: Days on board, Days at sea, Converted days, Manual determination.
- An adjustment reason is required when final accepted days differ from the selected basis (and always for a manual determination or “Accepted with adjustment”).
- Summary distinguishes total days on board, total days at sea, total converted days and total final accepted days.
- Older records are converted in memory: schema 0.4.0 (production `index.html`) and pre-0.4 records with `positionVerified`, `seaServiceVerified`, `tanker`, `polar`, `ice`, `dp`, `offshore`. Original legacy flags are kept in `voyage.metadata.legacyFields` and `record.migration.legacyRecordFields`.

Not in this build (by design): TP 2293 conversion rates, automatic certificate eligibility.

## Storage

| Key | Written by | Read by dev page |
|---|---|---|
| `SeaServiceRecord` (schema 0.4.0) | production `index.html` | yes — read-only, migrated in memory |
| `SeaServiceRecord.v0.5.0` | `dev/examiner.html` (“Save examiner draft”) | yes |

The dev page never writes to `SeaServiceRecord`.

## Installation

1. Unzip the package. Copy the `dev/` folder into the root of the `Sea-service-records-form` repository so that `dev/examiner.html` sits next to `index.html`. Do not overwrite any existing file — the package contains no production files.
2. Commit on a branch (e.g. `dev/v0.5.0-examiner`), open a pull request, and merge when the checklist in `docs/DEPLOYMENT_CHECKLIST.md` passes.
3. With GitHub Pages enabled, the page is served at `https://<pages-host>/Sea-service-records-form/dev/examiner.html`.
4. Local use: ES modules do not load from `file://`. From the repository root run
   `python -m http.server 8000` and open `http://localhost:8000/dev/examiner.html`.

## Running the checks (from `dev/`)

Requires Node.js 20+.

```
node tools/check-syntax.mjs ..        # JS / JSON / HTML syntax
node tools/check-deps.mjs ..          # every <script>/<link>/import resolves; lists unreferenced files
node --test tests/model.test.mjs      # 15 unit tests (model, migration, validation, summary, i18n)
npm i -D playwright && npx playwright install chromium
node tests/smoke.mjs                  # 17 browser smoke tests (production regression + dev page)
```

`npm test` runs all four in sequence.

## Files

| File | Purpose |
|---|---|
| examiner.html | Examiner review page (bilingual), with `<template id="reviewTemplate">` for per-line controls |
| css/examiner.css | Styles added on top of `../css/app.css` |
| js/dataModel.js | v0.5.0 schema factories and enums (from packageV0.5 `1dataModel.js`) |
| js/calculationEngine.js | Inclusive days, days at sea, basis days, adjustment flag; converted days reserved as null |
| js/migrationEngine.js | 0.4.0 / pre-0.4 → 0.5.0; normalises 0.5.0 records |
| js/validationEngine.js | Line and examiner-review validation codes |
| js/summaryEngine.js | Four-way totals and review counts |
| js/storageEngine.js | Separate draft key; read-only access to candidate record |
| js/examinerReview.js | Applies examiner input to a line |
| js/examinerI18n.js | English / French text and validation messages |
| js/referenceData.js | Capacity, vessel type, certificate, propulsion and voyage lists (copied from app.js) |
| js/examiner.js | Page controller |
| tests/ | Unit tests, smoke tests, fixtures |
| tools/ | Syntax and dependency checkers |
| docs/ | Dependency inventory, deployment and acceptance checklist |

## Changes from packageV0.5 source files

- Removed the `1` filename prefix so the relative imports resolve.
- `updateCandidateDays`: keeps a legacy day count when a record has no dates; DST-safe rounding.
- `updateExaminerBasis`: numeric comparison (form values are strings); no adjustment flag while basis is unset.
- Migration: handles `polarWaters`/`iceNavigation`, `dynamicPositioning`/`offshoreService`, `oilTanker`/`chemicalTanker`/`lngTanker`, record-level `examinerComments`; treats 0.4.0 `daysAtSea == daysOnBoard` as “not different”; preserves legacy flags; normalises 0.5.0 records instead of returning them unchecked.
- Validation: basis required to accept; whole-number final days; warnings for “consider Accepted with adjustment”, final above basis, capacity / specialized service not verified, legacy tanker records.
- Summary: `null` final days are not added; adds “lines not reviewed”.
- Storage: separate functions for candidate record and examiner draft.
