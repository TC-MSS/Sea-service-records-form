# Dependency Inventory — Sea Service Records Form

Repository snapshot: `Sea-service-records-form-main` (uploaded 2026-11-24), 25 files.
Generated with `dev/tools/check-deps.mjs` and `dev/tools/check-syntax.mjs`, then reviewed by hand.

## 1. Production reference graph (unchanged by this package)

```
index.html                         (production candidate form — WORKING)
 ├─ css/app.css                    [link]   ACTIVE
 ├─ js/certificateRules.js         [script] loaded; functions never called by app.js
 ├─ js/validationEngine.js         [script] loaded; functions never called by app.js
 ├─ js/storageEngine.js            [script] loaded; functions never called (would throw if called)
 └─ js/app.js                      [module] ACTIVE
     └─ js/seaServiceCalculator.js [import] ACTIVE (buildSummary)

examiner.html                      (production stub, 97 bytes — "Examiner Portal" heading only)
 └─ js/examiner-labels.js          [script] ACTIVE (runtime text replacement)

records.html                       (0 bytes — no references in or out)
```

No `fetch()` calls exist, so nothing in `data/` is loaded at runtime. No test files existed in the repository.

## 2. File-by-file inventory

| File | Type | Referenced by | Status | Notes |
|---|---|---|---|---|
| index.html | HTML | entry page | **Runtime — retain** | Candidate form. Comment before `<!DOCTYPE html>` forces quirks mode. |
| examiner.html | HTML | entry page | **Retain** (stub) | Replaced functionally by `dev/examiner.html`; keep until the dev page is promoted. |
| records.html | HTML | — | **Unreferenced, empty** | 0 bytes. |
| css/app.css | CSS | index.html, dev/examiner.html | **Runtime — retain** | Shared by production and the dev page (dev reads it, never modifies it). |
| js/app.js | JS module | index.html | **Runtime — retain** | Candidate UI, saves schema 0.4.0 under `SeaServiceRecord`. |
| js/seaServiceCalculator.js | JS module | js/app.js | **Runtime — retain** | Summary figures on index.html. See defects §4. |
| js/certificateRules.js | JS classic | index.html | **Retain** (loaded, inert) | Required by js/validationEngine.js. Removing it without editing index.html causes a 404. |
| js/validationEngine.js | JS classic | index.html | **Retain** (loaded, inert) | Certificate eligibility (Phase 3). Name collides with the v0.5 module — the v0.5 version lives in `dev/js/`. |
| js/storageEngine.js | JS classic | index.html | **Retain** (loaded, inert) | Calls `buildRecordObject()`, which is module-scoped in app.js → ReferenceError if ever called. Superseded by app.js save logic. |
| js/examiner-labels.js | JS classic | examiner.html | **Retain** until examiner.html is replaced | Text-replacement shim; not needed by dev/examiner.html (labels are authored directly). |
| js/translations.js | JS classic | — | **Unreferenced** | One-line comment stub (`// translations module`). |
| js/tp2293Calculation.js | JS module | — | **Unreferenced, duplicate** | Duplicates `SeaServiceCalculator.calculateQualifyingDays` (watch-factor table). |
| js/voyageAssessmentEngine.js | JS module | — | **Unreferenced, obsolete** | Expects `"Unlimited"`/`"Sheltered Waters"`; app.js stores `UNLIMITED`/`SHELTERED`, and reads `record.voyage` which app.js never sets. |
| js/1dataModel.js | JS module | — | **Unreferenced — packageV0.5 source** | Integrated (revised) as `dev/js/dataModel.js`. |
| js/1calculationEngine.js | JS module | — | packageV0.5 source | → `dev/js/calculationEngine.js` |
| js/1migrationEngine.js | JS module | — | packageV0.5 source | → `dev/js/migrationEngine.js` (imports `./dataModel.js` — broken under the `1` prefix) |
| js/1validationEngine.js | JS module | — | packageV0.5 source | → `dev/js/validationEngine.js` |
| js/1storageEngine.js | JS module | — | packageV0.5 source | → `dev/js/storageEngine.js` |
| js/1summaryEngine.js | JS module | — | packageV0.5 source | → `dev/js/summaryEngine.js` |
| js/1examinerReview.js | JS module | — | packageV0.5 source | → `dev/js/examinerReview.js` + `dev/js/examinerI18n.js` |
| data/certificates.json | JSON | — | **Unreferenced placeholder** | 2 entries; app.js has its own hard-coded list. |
| data/vesselThresholds.json | JSON | — | **Unreferenced placeholder** | |
| data/voyages.json | JSON | — | **Unreferenced placeholder** | |
| README.md | Doc | — | Retain | One line (GitHub Pages note). |
| Project_status.md | Doc | — | Retain | Phase plan. |

## 3. Duplicates

| Duplicate set | Resolution |
|---|---|
| `js/validationEngine.js` (classic, certificate rules) vs `js/1validationEngine.js` (v0.5 module) | Different purposes, same intended filename. v0.5 version lives in `dev/js/`. |
| `js/storageEngine.js` (classic, broken) vs `js/1storageEngine.js` (v0.5) | v0.5 version lives in `dev/js/`. Classic one is dead code. |
| `js/tp2293Calculation.js` vs `SeaServiceCalculator.calculateQualifyingDays` | Same watch-factor table twice. Keep one when TP 2293 work starts (Phase 6). |
| `js/examiner-labels.js` text replacement vs `EXAMINER_LABELS` in `js/1examinerReview.js` | Superseded by `dev/js/examinerI18n.js`. |
| Certificate list: static `<option>`s in index.html vs `certificates` array in app.js vs data/certificates.json | app.js overwrites the static options at start-up, so the static list (incl. STCW endorsements) is never shown. |
| `js/1*.js` vs `dev/js/*.js` | After this package is merged, the `1`-prefixed copies are redundant. |

## 4. Pre-existing production defects found (not changed — production is frozen)

1. `index.html` / `examiner.html` / `records.html`: content before `<!DOCTYPE html>` (or empty) → quirks mode.
2. `seaServiceCalculator.calculateOnboardDays` is **exclusive** (end − start) while app.js column R is **inclusive** (+1). Summary "Submitted days" is therefore 1 day lower per voyage than column R.
3. `seaServiceCalculator` looks for `captain`, `chief officer`, `officer` and `near` in lower-cased codes; app.js stores `MASTER`, `CHIEF_MATE`, `MATE`, `NC1`, `NC2`. Capacity and near-coastal breakdowns stay at 0 (except `ENGINEER_OFFICER`, which matches "officer").
4. `seaServiceCalculator` reads `polarWaters`, `iceNavigation`, `oilTanker`, `chemicalTanker`, `lngTanker`; app.js sends `oilTransfer`, `chemicalTransfer`, `gasTransfer`. Oil/chemical/gas totals stay at 0. Passenger, fishing, DP and offshore totals are never calculated.
5. index.html "Examiner Validation" checkboxes have no `id`/`name` and are not saved.
6. `js/storageEngine.js` would throw if called (see §2).

These are recorded for the next phases; the dev package does not depend on any of them.

## 5. Files safe to delete

Safe now (no runtime reference; verified by `check-deps.mjs` and smoke tests):

- `records.html` (empty)
- `js/translations.js` (comment-only stub)
- `js/voyageAssessmentEngine.js` (obsolete, incompatible codes)
- `js/tp2293Calculation.js` (duplicate logic — archive in a branch if you want it for Phase 6 reference)

Safe **after** `dev/` is merged into the repository:

- `js/1calculationEngine.js`, `js/1dataModel.js`, `js/1examinerReview.js`, `js/1migrationEngine.js`, `js/1storageEngine.js`, `js/1summaryEngine.js`, `js/1validationEngine.js`

Optional (placeholders; delete or populate when reference data moves out of app.js):

- `data/certificates.json`, `data/vesselThresholds.json`, `data/voyages.json`

## 6. Files that must be retained

Production runtime (do not delete or rename):

- `index.html`, `css/app.css`, `js/app.js`, `js/seaServiceCalculator.js`
- `js/certificateRules.js`, `js/validationEngine.js`, `js/storageEngine.js` — referenced by `<script>` tags in index.html; removing them causes 404s. Remove only together with an index.html edit.
- `examiner.html`, `js/examiner-labels.js` — until `dev/examiner.html` is promoted.
- `README.md`, `Project_status.md`

Development package (new):

- `dev/examiner.html`, `dev/css/examiner.css`
- `dev/js/dataModel.js`, `calculationEngine.js`, `migrationEngine.js`, `validationEngine.js`, `summaryEngine.js`, `storageEngine.js`, `examinerReview.js`, `examinerI18n.js`, `referenceData.js`, `examiner.js`
- `dev/tests/*`, `dev/tools/*`, `dev/package.json`, `dev/README-DEV.md`, `dev/docs/*`

## 7. Development package reference graph (v0.6.0-dev.1)

```
dev/index.html  (candidate form)                 dev/examiner.html
 ├─ ../css/app.css  (shared, read-only)           ├─ ../css/app.css
 ├─ css/examiner.css                              ├─ css/examiner.css
 ├─ css/candidate.css                             └─ js/examiner.js
 └─ js/candidate.js                                    ├─ examinerI18n.js, referenceData.js
      ├─ examinerI18n.js, referenceData.js             ├─ examinerReview.js ─ calculationEngine.js, validationEngine.js
      ├─ dataModel.js                                  ├─ validationEngine.js ─ dataModel.js
      ├─ calculationEngine.js ─ tp2293Engine.js        ├─ summaryEngine.js ─ dataModel.js, tp2293Engine.js
      ├─ validationEngine.js                           ├─ calculationEngine.js ─ tp2293Engine.js
      ├─ summaryEngine.js                              ├─ tp2293Engine.js
      └─ storageEngine.js ─ migrationEngine.js         └─ storageEngine.js ─ migrationEngine.js ─ dataModel.js, calculationEngine.js

dev/tests/model.test.mjs, tp2293.test.mjs → dev/js/* + tests/fixtures/*.json  (Node test runner)
dev/tests/smoke.mjs → serves the repo root; loads index.html, dev/index.html, dev/examiner.html (Playwright)
```

New files that must be retained with the dev package: `dev/index.html`, `dev/css/candidate.css`, `dev/js/candidate.js`, `dev/js/tp2293Engine.js`, `dev/tests/tp2293.test.mjs`, `dev/docs/CALCULATION_RULES.md`.

`js/tp2293Calculation.js` and the watch table in `js/seaServiceCalculator.js` are now superseded by `dev/js/tp2293Engine.js`. The production calculator stays in place until the production candidate form is replaced.
