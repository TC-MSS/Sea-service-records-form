# Sea Service Records Form — v0.9.0

## What changed in v0.9.0

1. Examiner vets **ice and transfer-operation days** per line (automatic, final, reason). Above the line's counted days = error; save and export refused until corrected.
2. Examiner summary shows the final service figures, "(adjusted — automatic N)" when changed.
3. Candidate: ice days above days on board highlighted on the line and blocking export (ice days optional).
4. Older records: not required this release (conversion code kept).
6. Candidate reminder next to the export buttons (what to send to the Transport Canada Centre examiner).
7. Candidate mandatory fields by certificate department (EXN 2), "Days at sea" mandatory.
8. NC1 / NC2 shown as "Near Coastal, Class 1 / 2".
9. File names `CDN - SURNAME - UNVETTED|VETTED QUALIFYING SEA SERVICE - ACRONYM - TOTAL OF X DAYS FROM … TO …`.
10. Examiner export requires the name, a status and five verification boxes on every line.
11. Examiner review date shown automatically; candidate application date defaults to today.

New shared modules: `js/recordRules.js` (departments, acronyms, export checks, file names), `js/serviceVetting.js` (service vetting). Tests: 44 unit, 43 smoke.

---

# v0.8.0 notes

## What changed in v0.8.0

1. Capacity `MATE` shown as **"Mate in Charge of a Watch" / "Officier de pont en charge du quart à la passerelle"** (code unchanged).
2. **Applicant Declaration mandatory** before Export JSON and Export PDF / Print, with a caution message (Save still allowed).
3. Examiner: **Final accepted days** enabled only for "Accepted with adjustment" and "Additional information required". "Accepted" counts the converted days. "Not reviewed" removed from the choices (starting state "Select a status"); automatic status removed.
4. Examiner **basis removed**; the reference is always the converted days.
5. Summary: **total final accepted days in bold, followed by the certificate applied for**.
6. Summary reduced (no "Lines …", Accepted, Accepted with adjustment or Rejected counts) and **approved days per special service**, overlapping dates counted once.

Reviews saved by v0.6/v0.7 are converted on load without losing the examiner's figure. Tests: 38 unit, 35 smoke.

---

# v0.7.0 notes

Automated sea service calculation under TP 2293 Chapter 3 and the Marine Personnel Regulations (ss. 115–117), shared by the **production** candidate page and the development pages.

From v0.7.0, `dev/js` and `dev/css` are **production runtime**: the production `index.html` loads `js/app.js`, which imports `dev/js/candidate.js`. Do not delete or rename them.

## Pages

| Page | Purpose |
|---|---|
| `index.html` (production) | Candidate form. Calculates R and T as the candidate types, labelled **unvetted**. Save (this browser), Export JSON (to e-mail), Import JSON, Export PDF / Print. |
| `dev/index.html` | Same form, development title and banner. |
| `dev/examiner.html` | Examiner review: Import JSON / load from this browser, per-line review, final accepted days, summary, Export PDF / Print. |

## What changed in v0.7.0

1. **Production uses the shared engine** (`dev/js/tp2293Engine.js`, unchanged). Column T and the summary are shown with the bilingual "unvetted" label. Column R uses TP 2293 s. 3.3(4). The old calculator and the examiner-only sections were removed from the candidate page.
2. **Examiner page:** "Schema / record" no longer displayed (still in the JSON).
3. **Adjustment reason:** neutral "(required)" when needed, red only while empty.
4. **Final accepted days override everything.** Basis optional (reference = converted days). Missing reason = warning. Final days on a Not reviewed line set the status automatically. Rejected = 0. Summary shows the difference from total converted days.
5. **Column K:** both ice conditions can be selected, each with its own number of days.
6. **Export PDF / Print** on all pages (browser "Save as PDF").

### Cause of the "Final accepted days not accepted" bug (v0.6.0)

Reproduced on v0.6.0-dev.1 with the 0.4.0 test record:

| Action on line 1 (converted 30) | v0.6.0 result |
|---|---|
| Not reviewed, no basis, final 25 | Total final accepted days **0** — the summary counted only Accepted / Accepted with adjustment lines. |
| Status Accepted, no basis | Counted, but error **"Select an examiner basis"** — the basis was mandatory and the line was flagged in error. |
| Accepted with adjustment, reason typed | Error remained (basis), and the reason field **stayed red** — `refreshLine()` set the `required` class whenever a reason was needed, not when it was missing (bug 3). |
| Additional information required, final 25 | Total **0**. |

Also, with no basis, the final days were never compared with anything (`adjustmentRequired` was false when basis = NONE).

## Storage keys (browser)

| Key | Written by | Read by |
|---|---|---|
| `SeaServiceRecord` (0.4.0) | production page **before** v0.7.0 | all pages, read-only (converted in memory) |
| `SeaServiceRecord.v0.5.0.candidate` | `index.html`, `dev/index.html` | both candidate pages; examiner "Load candidate record" (first) |
| `SeaServiceRecord.v0.5.0` | `dev/examiner.html` (draft) | `dev/examiner.html` |

## Checks (from `dev/`, Node 20+)

```
node tools/check-syntax.mjs ..
node tools/check-deps.mjs ..
node --test tests/model.test.mjs tests/tp2293.test.mjs     # 44 unit tests
npm i -D playwright && npx playwright install chromium
node tests/smoke.mjs                                       # 43 browser smoke tests (production page included)
```

`npm test` runs all of them. Latest results: `docs/TEST_RESULTS.txt`. The smoke test writes `tests/smoke-*.png` screenshots; do not commit them.

## Files changed in v0.7.0

| File | Change |
|---|---|
| `../index.html` | **production** — rebuilt on the shared form; unvetted label; column T; summary; column K; Import / Export JSON; Export PDF; DOCTYPE first |
| `../js/app.js` | **production** — entry point importing `dev/js/candidate.js` |
| index.html, examiner.html | v0.7.0 text; column K; examiner items 2–4; PDF |
| css/candidate.css, css/examiner.css | column K, unvetted label, reason indicator, print view |
| js/printView.js | **new** — PDF / print copy |
| js/candidate.js | shared production/dev controller; column K; import; PDF |
| js/examiner.js, js/examinerReview.js | items 2–4, automatic status |
| js/calculationEngine.js, js/validationEngine.js, js/summaryEngine.js | reference value, counted figure, warnings, ice |
| js/dataModel.js, js/migrationEngine.js, js/storageEngine.js | 0.7.0 fields, ice migration, comments |
| js/examinerI18n.js | EN/FR text |
| js/tp2293Engine.js, js/referenceData.js | unchanged |
| tests/model.test.mjs, tests/smoke.mjs | updated |
| docs/*, package.json, README-DEV.md | updated |
