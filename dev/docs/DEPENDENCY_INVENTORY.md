# Dependency Inventory — Sea Service Records Form v0.9.0

Repository snapshot: `Sea-service-records-form-main` (main after v0.8.0, downloaded 2026-11-27) plus the v0.9.0 package.
Generated with `dev/tools/check-deps.mjs` and `dev/tools/check-syntax.mjs`, then reviewed by hand.
Result: **all local references resolve; no missing targets.**

## 0a. v0.9.0 in one paragraph

Two **new shared modules**, loaded by the production page as well as the development pages:

- `dev/js/recordRules.js` — certificate department and acronym, candidate export check (mandatory fields EXN 2, ice days ≤ days on board), file names, date range, today's date. Imported by `candidate.js` and `examiner.js`.
- `dev/js/serviceVetting.js` — examiner vetting of ice / transfer-operation days. Imported by `calculationEngine.js`, `summaryEngine.js` and `examiner.js`.

Production file changed: `index.html` (S header, mandatory note, reminder). Shared modules changed: `candidate.js`, `calculationEngine.js`, `dataModel.js`, `examinerI18n.js`, `examinerReview.js`, `printView.js`, `referenceData.js`, `summaryEngine.js`, `validationEngine.js`, `dev/css/candidate.css`, `dev/css/examiner.css`. Unchanged: `js/app.js`, `tp2293Engine.js`, `migrationEngine.js`, `storageEngine.js`. No file deleted; the retired files in §5 are still present.

Updated graph additions:

```
dev/js/candidate.js ─ recordRules.js
dev/js/examiner.js  ─ recordRules.js, serviceVetting.js
dev/js/calculationEngine.js ─ serviceVetting.js
dev/js/summaryEngine.js ─ serviceVetting.js
```

## 0. v0.8.0 in one paragraph

No file was added, moved or deleted. The reference graph is the same as v0.7.0 (§2–3). Production files changed: `index.html` (declaration caution). Production runtime modules changed under `dev/js` and `dev/css` (shared with the production page): `candidate.js`, `referenceData.js`, `calculationEngine.js`, `validationEngine.js`, `summaryEngine.js`, `examinerReview.js`, `examinerI18n.js`, `dataModel.js`, `printView.js`, `examiner.css`. `js/app.js` is unchanged. The retired files in §5 are still present (clean-up pull request not yet done).

## 1. What changed in the structure (v0.7.0)

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
| index.html | entry page | **Runtime — changed in v0.8.0** | v0.8.0: declaration section id + mandatory caution. (v0.7.0: candidate form on the shared engine; DOCTYPE first.) |
| js/app.js | index.html | Runtime — unchanged in v0.8.0 | One-line entry: `import "../dev/js/candidate.js"`. |
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
| dev/js/candidate.js | index.html (via js/app.js), dev/index.html | **Runtime (production + dev) — changed** | v0.8.0: declaration mandatory before Export JSON / PDF. Shared controller; column K, unvetted label, Import JSON, Export PDF. |
| dev/js/tp2293Engine.js | calculationEngine, summaryEngine, examiner.js | **Runtime — unchanged** | Single source of truth for the rules. |
| dev/js/calculationEngine.js | candidate, examiner, migration | Runtime — changed | v0.8.0: no basis; final days only for adjustment / information required; legacy review conversion. |
| dev/js/dataModel.js | most modules | Runtime — changed | v0.8.0: app version 0.8.0; `specialServiceApprovedDays` in the summary. |
| dev/js/validationEngine.js | candidate, examiner, summary | Runtime — changed | v0.8.0 examiner warnings (no basis, Accepted without converted days). |
| dev/js/summaryEngine.js | candidate, examiner | Runtime — changed | v0.8.0: approved days per special service, overlapping dates counted once. |
| dev/js/examinerReview.js | examiner.js | Runtime — changed | v0.8.0: automatic status and basis input removed. |
| dev/js/migrationEngine.js | storageEngine | Runtime — unchanged in v0.8.0 | Older ice code → conditions. |
| dev/js/storageEngine.js | candidate, examiner | Runtime — unchanged in v0.8.0 | Keys unchanged. |
| dev/js/examinerI18n.js | candidate, examiner, printView | Runtime — changed | v0.8.0 EN/FR text. |
| dev/js/printView.js | candidate, examiner | Runtime — changed | v0.8.0: examiner summary layout; declaration caution copy. |
| dev/js/examiner.js | dev/examiner.html | Dev — changed | v0.8.0 items 3–6. |
| dev/js/recordRules.js | candidate, examiner | **Runtime — new in v0.9.0** | Departments, acronyms, export checks, file names. |
| dev/js/serviceVetting.js | calculationEngine, summaryEngine, examiner | **Runtime — new in v0.9.0** | Ice / transfer-operation vetting. |
| dev/js/referenceData.js | candidate, examiner, printView | **Runtime — changed** | v0.8.0: MATE label "Mate in Charge of a Watch" / "Officier de pont en charge du quart à la passerelle". |
| dev/css/examiner.css | production and dev pages | **Runtime — changed** | v0.8.0: total box, declaration caution. |
| dev/css/candidate.css | production and dev pages | **Runtime — changed in v0.9.0** | Mandatory markers, ice highlight, reminder. |
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

Delete them in a **separate** pull request (INSTALL_v0.7.0.md, step 10), so each release can be undone on its own.

## 6. Files that must be retained

- `index.html`, `js/app.js`, `css/app.css`
- **all of `dev/js/` and `dev/css/`** (production runtime from v0.7.0), including `recordRules.js` and `serviceVetting.js` (v0.9.0)
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
