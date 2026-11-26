# Dependency Inventory — Sea Service Records Form v0.7.0

Repository snapshot: `Sea-service-records-form-main` (main after v0.6.0-dev.1, downloaded 2026-11-25) plus the v0.7.0 package.
Generated with `dev/tools/check-deps.mjs` and `dev/tools/check-syntax.mjs`, then reviewed by hand.
Result: **all local references resolve; no missing targets.**

## 1. What changed in the structure

From v0.7.0 the **production candidate page uses the shared modules in `dev/js` and `dev/css`**. The rules live in one file, `dev/js/tp2293Engine.js`, and the candidate page and the examiner page both use it. `dev/` is therefore **production runtime**: do not delete or rename `dev/js` or `dev/css`. (A later release can move them to a neutral folder such as `js/core/`. This one does not, because moving files through the GitHub web upload means deleting each old file by hand.)

The production page no longer loads `js/seaServiceCalculator.js`, `js/certificateRules.js`, `js/validationEngine.js` or `js/storageEngine.js`. Nothing else references them, so they can be deleted (§5).

## 2. Production reference graph (v0.7.0)

```
index.html                          (production candidate form — standards mode, no quirks)
 ├─ css/app.css                     [link]
 ├─ dev/css/examiner.css            [link]   summary cards, banners, print view
 ├─ dev/css/candidate.css           [link]   table, column K, unvetted label
 └─ js/app.js                       [module] production entry (one import)
     └─ dev/js/candidate.js         [import] form controller (data-variant="production")
         ├─ examinerI18n.js, referenceData.js, dataModel.js
         ├─ calculationEngine.js ─ tp2293Engine.js, dataModel.js
         ├─ validationEngine.js ─ dataModel.js
         ├─ summaryEngine.js ─ dataModel.js, tp2293Engine.js, validationEngine.js
         ├─ storageEngine.js ─ migrationEngine.js ─ dataModel.js, calculationEngine.js
         └─ printView.js ─ examinerI18n.js, referenceData.js, dataModel.js

examiner.html                       (production stub — unchanged)
 └─ js/examiner-labels.js           [script]

records.html                        (0 bytes — unchanged, unreferenced)
```

## 3. Development reference graph (v0.7.0)

```
dev/index.html  (candidate, data-variant="development")    dev/examiner.html
 ├─ ../css/app.css                                          ├─ ../css/app.css
 ├─ css/examiner.css, css/candidate.css                     ├─ css/examiner.css
 └─ js/candidate.js  (same tree as production above)        └─ js/examiner.js
                                                                 ├─ examinerI18n.js, referenceData.js
                                                                 ├─ examinerReview.js ─ calculationEngine.js, validationEngine.js
                                                                 ├─ validationEngine.js, summaryEngine.js
                                                                 ├─ calculationEngine.js ─ tp2293Engine.js, dataModel.js
                                                                 ├─ tp2293Engine.js
                                                                 ├─ printView.js
                                                                 └─ storageEngine.js ─ migrationEngine.js

dev/tests/model.test.mjs, tp2293.test.mjs → dev/js/* + tests/fixtures/*.json  (Node test runner)
dev/tests/smoke.mjs → serves the repo root; loads index.html, dev/examiner.html, dev/index.html (Playwright)
```

No `fetch()` calls: nothing in `data/` is loaded at runtime. No external (CDN) scripts.

## 4. File-by-file inventory

| File | Referenced by | Status v0.7.0 | Notes |
|---|---|---|---|
| index.html | entry page | **Runtime — changed** | New candidate form on the shared engine. Comment before `<!DOCTYPE html>` removed (quirks-mode defect fixed). |
| js/app.js | index.html | **Runtime — changed** | One-line entry: `import "../dev/js/candidate.js"`. |
| css/app.css | index.html, dev pages | Runtime — unchanged | |
| examiner.html | entry page | Retain (stub) — unchanged | Replaced functionally by `dev/examiner.html`. |
| js/examiner-labels.js | examiner.html | Retain — unchanged | Until `examiner.html` is replaced. |
| records.html | — | Unreferenced, empty | |
| js/seaServiceCalculator.js | — | **Retired — safe to delete** | No longer imported. Replaced by `dev/js/tp2293Engine.js` + `summaryEngine.js`. |
| js/certificateRules.js | — | **Safe to delete** | Was loaded by the old index.html only. |
| js/validationEngine.js | — | **Safe to delete** | Was loaded by the old index.html only (certificate rules, never called). |
| js/storageEngine.js | — | **Safe to delete** | Was loaded by the old index.html only; would have thrown if called. |
| js/translations.js | — | Safe to delete | Comment-only stub. |
| js/tp2293Calculation.js | — | Safe to delete | Duplicate of the old watch-factor table. |
| js/voyageAssessmentEngine.js | — | Safe to delete | Obsolete, incompatible codes. |
| js/1*.js (7 files) | — | Safe to delete | packageV0.5 sources, integrated in `dev/js`. |
| data/*.json (3 files) | — | Optional | Placeholders. |
| dev/js/candidate.js | index.html (via js/app.js), dev/index.html | **Runtime (production + dev) — changed** | Shared controller; `<body data-variant>` selects the title. Column K, unvetted label, Import JSON, Export PDF. |
| dev/js/tp2293Engine.js | calculationEngine, summaryEngine, examiner.js | **Runtime — unchanged** | Single source of truth for the rules. |
| dev/js/calculationEngine.js | candidate, examiner, migration | Runtime — changed | Column K sync; reference value; counted figure. |
| dev/js/dataModel.js | most modules | Runtime — changed | App version 0.7.0; `iceConditions`; examiner `referenceDays`, `effectiveAcceptedDays`, `statusSetAutomatically`. |
| dev/js/validationEngine.js | candidate, examiner, summary | Runtime — changed | Ice checks; examiner checks are warnings (never block). |
| dev/js/summaryEngine.js | candidate, examiner | Runtime — changed | Counted figure, difference, ice totals. |
| dev/js/examinerReview.js | examiner.js | Runtime — changed | Automatic status (4(d)). |
| dev/js/migrationEngine.js | storageEngine | Runtime — changed | Older ice code → conditions. |
| dev/js/storageEngine.js | candidate, examiner | Runtime — changed (comments only) | Keys unchanged. |
| dev/js/examinerI18n.js | candidate, examiner, printView | Runtime — changed | New EN/FR text. |
| dev/js/printView.js | candidate, examiner | **Runtime — new** | Read-only copy for Export PDF / Print. |
| dev/js/examiner.js | dev/examiner.html | Dev — changed | Items 2, 3, 4; PDF. |
| dev/js/referenceData.js | candidate, examiner, printView | Runtime — unchanged | |
| dev/css/examiner.css, dev/css/candidate.css | production and dev pages | **Runtime — changed** | |
| dev/index.html, dev/examiner.html | entry pages | Dev — changed | |
| dev/tests/*, dev/tools/*, dev/package.json, dev/README-DEV.md, dev/docs/* | Node / docs | Retain | |

## 5. Files safe to delete (after v0.7.0 is merged and verified)

Verified by `check-deps.mjs` (listed as unreferenced) and by the smoke test, which checks that the production page does not request them:

- `js/seaServiceCalculator.js`
- `js/certificateRules.js`, `js/validationEngine.js`, `js/storageEngine.js`
- `js/translations.js`, `js/tp2293Calculation.js`, `js/voyageAssessmentEngine.js`
- `js/1calculationEngine.js`, `js/1dataModel.js`, `js/1examinerReview.js`, `js/1migrationEngine.js`, `js/1storageEngine.js`, `js/1summaryEngine.js`, `js/1validationEngine.js`
- `records.html` (empty)

Optional: `data/certificates.json`, `data/vesselThresholds.json`, `data/voyages.json`.

Delete them in a **separate** pull request (INSTALL.md, step 10), so the v0.7.0 change can be undone on its own.

## 6. Files that must be retained

- `index.html`, `js/app.js`, `css/app.css`
- **all of `dev/js/` and `dev/css/`** (production runtime from v0.7.0)
- `dev/index.html`, `dev/examiner.html`
- `examiner.html`, `js/examiner-labels.js` — until `dev/examiner.html` is promoted
- `dev/tests/*`, `dev/tools/*`, `dev/package.json`, docs, `README.md`, `Project_status.md`

## 7. Browser storage keys

| Key | Schema | Written by | Read by |
|---|---|---|---|
| `SeaServiceRecord` | 0.4.0 | production page **before** v0.7.0 | all v0.7.0 pages, read-only (converted in memory) |
| `SeaServiceRecord.v0.5.0.candidate` | 0.5.0 | production `index.html` (from v0.7.0), `dev/index.html` | both candidate pages; examiner "Load candidate record" (checked first) |
| `SeaServiceRecord.v0.5.0` | 0.5.0 | `dev/examiner.html` (draft) | `dev/examiner.html` |

Every record stays in the browser where it was saved. Records move between people only as exported JSON files (candidate → e-mail → examiner **Import JSON**).

## 8. Production defects from the v0.6.0 list (§4 of the previous inventory)

| # | Defect | v0.7.0 |
|---|---|---|
| 1 | Content before `<!DOCTYPE html>` → quirks mode | **Fixed in index.html.** `examiner.html` and `records.html` unchanged. |
| 2 | Calculator exclusive vs. column R inclusive | **Fixed** — one TP 2293 count everywhere. |
| 3 | Capacity codes never matched | **Removed** — old breakdown section removed. |
| 4 | Specialized totals always 0 | **Removed**; ice days now totalled from column K. |
| 5 | "Examiner Validation" checkboxes not saved | **Removed** from the candidate page (examiner checks are on `dev/examiner.html`). |
| 6 | `js/storageEngine.js` would throw | No longer loaded — safe to delete. |
