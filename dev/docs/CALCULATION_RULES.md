# Sea Service Calculation Rules — v0.9.0

Rules version stored with every calculated line (`calculation.calculationRuleVersion`): `TP2293-CH3_MPR-115-117_v1.0` — unchanged in v0.7.0, v0.8.0 and v0.9.0 (`dev/js/tp2293Engine.js` was not modified).

**v0.7.0:** the production candidate form (`index.html`) now uses this same engine, through `dev/js/candidate.js`. The candidate, development and examiner pages therefore always show the same column R and column T figures. On the candidate pages the results are labelled *Unvetted sea service — subject to examiner review / Service en mer non vérifié — sous réserve de l’examen par l’examinateur*.

Engine: `dev/js/tp2293Engine.js`.
Sources: TP 2293 Chapter 3 (pages 28–38 of TP 2293F, in the project) and the Marine Personnel Regulations, SOR/2007-115, ss. 1, 115–117 (current to 29 October 2026).

## 1. Rules applied automatically

| ID | Rule | Source | Formula in the engine |
|---|---|---|---|
| R1 | Days on board (column R) | TP 2293 s. 3.3(1),(4); Table 1, line (A) | discharge date − engagement date. The engagement and discharge days together count as one day; minimum 1 day. |
| R2 | 8 hours = 1 day | MPR s. 115(1) | 8-hour watch: credited = A |
| R3 | Watches other than 8 h | MPR s. 115(2); TP 2293 s. 3.5(1) | credited = A × min(hours, 12) ÷ 8. 12-hour watch = 1.5 days. |
| R4 | Approved cadet program | MPR s. 115(2) | DECK_CADET / ENGINEER_CADET: credited = A (no proration, no attestation warning) |
| R5a | Days under way, 8-h watch | TP 2293 s. 3.7(1)(a); MPR s. 116 | When column S differs from R: credited = min(1.5 × B, A) |
| R5b | Days under way, 12-h watch | TP 2293 s. 3.7(1)(b); MPR s. 116 | credited = min(2.25 × B, 1.5 × A) |
| R6 | Junior officer to the OOW | MPR s. 117 | SUPERNUMERARY_MATE: credited × 2/3; total for all such lines capped at 9 months (270 days) |
| R7 | Months | MPR s. 115(3) | months = credited days ÷ 30 |
| R8 | No double counting | TP 2293 s. 3.3(2),(3) | Overlapping dates between lines are flagged with the number of days. A same-day change-over (discharge and engagement on the same date) is not an overlap. |

A = days on board (R1); B = days at sea / under way entered in column S.

**Capacity labels (v0.8.0):** code `MATE` is shown as **"Mate in Charge of a Watch" / "Officier de pont en charge du quart à la passerelle"** (was "Mate" / "Officier de pont"). The code is unchanged, so saved records and the rules are unaffected. R6 still applies only to `SUPERNUMERARY_MATE`.

**Labels (v0.9.0):** voyage codes `NC1` / `NC2` are shown as **"Near Coastal, Class 1 / 2"** / **"À proximité du littoral, classe 1 / 2"** (codes unchanged). Column S is now **"Days at sea"** and is mandatory (see §7): when S equals R the normal rule applies; when S is lower the days-under-way method (R5) applies, as before.

**Rounding:** credited days are rounded **down** to whole days. No partial day is credited. The unrounded value is kept in `calculation.convertedDaysExact`.

## 2. Situations sent to manual review (no automatic figure)

| Code | Situation | Source |
|---|---|---|
| MOU_NOT_UNDERWAY_OR_DP | Vessel type MOU, and column O is not DP or DP + offshore | TP 2293 ss. 3.20–3.21, Tables III–VI (rates and limits depend on the certificate sought and the position held) |
| NON_PROPELLED_VESSEL_DECK | Vessel type Barge with a deck capacity | TP 2293 s. 3.25 |
| DAYS_UNDERWAY_WATCH_NOT_8_OR_12 | Days under way entered with a watch other than 8 or 12 h | TP 2293 s. 3.7 defines 8 h and 12 h only |
| CALCULATION_ERROR | Days at sea greater than days on board | — |

## 3. Warnings (figure calculated, examiner to confirm)

| Code | Meaning | Source |
|---|---|---|
| ATTESTATION_REQUIRED_OVER_8H | Watch > 8 h needs a testimonial of regular watches (one day on, one day off or equivalent). Not shown for cadets. | TP 2293 ss. 3.3(6), 3.5(1) |
| DAYS_UNDERWAY_METHOD_CONFIRM | Days-under-way method applied. Confirm the vessel was in commercial activity other than carrying passengers or cargo, or in dry-dock or repair. | TP 2293 s. 3.7; MPR s. 116 |
| JUNIOR_OFFICER_9_MONTH_LIMIT / _CAP_APPLIED | 2/3 credit and 9-month limit | MPR s. 117 |
| MOU_DP_FULL_RATE | MOU on DP credited at the normal rate | TP 2293 s. 3.20(1) |
| DREDGER_SELF_PROPELLED_CHECK | Only a self-propelled sea-going dredger counts for deck certificates | TP 2293 s. 3.25 |
| AIR_CUSHION_MASS_CHECK | 7 000 kg / 10 000 kg mass requirements | TP 2293 s. 3.24 |
| WATCH_HOURS_ASSUMED_8 / WATCH_HOURS_CAPPED_12 | Missing watch hours, or watch above 12 h | MPR s. 115 |
| OVERLAPPING_SERVICE | Days overlap with another line (not deducted automatically) | TP 2293 s. 3.3(2) |

## 4. Worked examples (all covered by `tests/tp2293.test.mjs`)

| Case | Inputs | Result |
|---|---|---|
| 8-h watch | 1 Jan → 2 Mar 2025 (A = 60) | 60 |
| 12-h watch | 1 → 30 Jan (A = 29) | 29 × 1.5 = 43.5 → **43** |
| Cadet, 12-h | 1 → 31 Jan (A = 30) | **30** |
| TP 2293 Table 1, 8-h | A = 100, B = 60 | min(90, 100) = **90** |
| TP 2293 Table 1, 12-h | A = 100, B = 60 | min(150, 135) = **135** |
| Junior officer | A = 30, 8-h | 30 × 2/3 = **20** |
| Junior officer cap | 243 + 40 junior + 30 mate | 270 + 30 = **300** |

## 5. Examiner determination (v0.8.0)

The TP 2293 converted days (column T) are the reference. The **examiner basis was removed** in v0.8.0; older records keep `examinerBasis` in the JSON but it is not used.

| Review status | Final accepted days box | Figure counted in "Total final accepted days" |
|---|---|---|
| *(no status yet — "Select a status")* | disabled | 0 |
| Accepted | disabled (shows the converted days as a hint) | the converted days; 0 with a warning if the line could not be calculated |
| Accepted with adjustment | **enabled** | the final accepted days (0 until entered, with a warning) |
| Additional information required | **enabled** | the final accepted days if entered, otherwise 0 |
| Rejected | disabled | 0 |

"Not reviewed" is no longer a choice in the list; it is only the starting state ("Select a status"). The automatic status of v0.7.0 was removed. Changing to a status whose box is disabled clears the final days. Final days that are negative or not a whole number are an error and count 0.

**Adjustment reason:** always needed for "Accepted with adjustment"; needed for "Additional information required" when the final days differ from the converted days. A missing reason is a **warning** (red field, red message) and never blocks saving.

**Reviews saved by v0.6.0/v0.7.0** are converted when loaded, keeping the examiner's figure: Accepted or Not reviewed with final days equal to the converted days → Accepted; with other final days → Accepted with adjustment (final days kept); Rejected → final days cleared. The line shows `REVIEW_STATUS_CONVERTED_V080`.

**Summary — Examiner determination (v0.8.0):**

1. **Total final accepted days** and months (÷ 30), in bold, followed by the **certificate applied for** in bold.
2. Difference from the total converted days (final − converted; negative in red, positive in green).
3. Additional information required (number of lines).
4. **Approved special service** — see §5a.

Removed: every "Lines …" count (reviewed, not reviewed, with final days, missing a reason, with errors) and the Accepted, Accepted with adjustment and Rejected counts. The values are still computed in the saved JSON.

### 5a. Approved days per special service (v0.8.0)

Shown for each special service that is selected on at least one line: Polar waters, Acceptable ice service, Passenger service, Oil / Chemical / Gas transfer, Fishing service, Dynamic positioning, Offshore service (DP and offshore counts under both).

- **Line figure:** the line's counted days (above). For the ice conditions: the days the candidate entered for that condition, limited to the line's counted days (0 if no days were entered).
- **No duplication:** within one service, each line's figure is spread evenly over its service days (engagement day to the day before discharge, as in TP 2293 s. 3.3(4)). Where lines with the same service overlap, each calendar day counts once, at the higher daily value. Lines without dates are added as they are. The result is rounded down.
- A line can count under several services (e.g. polar waters and oil transfer). The service totals therefore do not add up to the overall total.

Example (unit test): oil transfer on 1–31 Jan (30 days) and 21 Jan–10 Feb (20 days), both accepted → 30 + 20 − 10 overlapping days = **40**.

### 5b. Examiner vetting of ice and transfer-operation days (v0.9.0)

On each line where Polar waters, Acceptable ice service or a transfer operation (oil / chemical / gas) is selected, the examiner sees one row per service: **Automatic** (the §5a figure), **Final accepted days** and **Reason**.

| Situation | Figure used for the service on that line |
|---|---|
| Final accepted days blank | the automatic figure |
| Final accepted days entered, ≤ the line's counted days | the final figure |
| Final accepted days above the line's counted days | **error** `SERVICE_DAYS_EXCEED_LINE`; the figure is capped at the line's counted days, and **Save draft, Export JSON and Export PDF are refused** until it is corrected |
| Negative or fractional | error `SERVICE_DAYS_INVALID`, counts 0 |
| Line Rejected or without a status | inputs disabled and cleared; counts 0 |

A reason is needed (per service) when the final figure differs from the automatic one: warning `SERVICE_REASON_REQUIRED`, red until typed, never a block.

**Summary:** "Approved special service" uses the final figures (overlapping dates still counted once). When the examiner adjusted a service on any line it shows **final** (adjusted — automatic N), e.g. "Polar waters: **25** (adjusted — automatic 30)". Passenger, fishing, DP and offshore remain automatic.

**JSON:** per line `examinerReview.serviceReview[code] = { automaticDays, finalAcceptedDays, adjustmentReason, effectiveDays, adjusted, overLimit, invalid, reasonMissing }`; in the summary `specialServiceApprovedDays` (final), `specialServiceAutomaticDays` and `specialServiceAdjusted`.

## 6. Column K — ice service (v0.7.0)

Column K keeps the two conditions (Polar waters; Acceptable ice service). Both can be selected, and each has its own number of days entered by the candidate. Typing days ticks the condition; unticking clears the days.

Stored as `specializedService.iceConditions = { POLAR: {selected, days}, ACCEPTABLE_ICE: {selected, days} }`. The older single code `specializedService.iceService` (NONE / POLAR / ACCEPTABLE_ICE / POLAR_AND_ACCEPTABLE_ICE) is still written, derived from the selection, so older tools keep reading it. Older records convert to selected conditions with days blank.

Checks: condition selected without days → warning `ICE_DAYS_NOT_STATED`; days above days on board → error `ICE_DAYS_EXCEED_ONBOARD`; negative or fractional days → error `ICE_DAYS_INVALID`. The ice days are not converted and do not change column T; they are totalled in the summary ("Polar waters (days entered)", "Acceptable ice service (days entered)") for the examiner. The two conditions may overlap, so no combined limit is applied.

## 7. Export requirements and file names (v0.9.0)

### Candidate (production and development candidate pages)

Export JSON and Export PDF / Print are refused, with a list of what to fix, until:

- the certificate applied for, surname and CDN number are entered (they form the file name);
- the Applicant Declaration is ticked (v0.8.0);
- every line has the **mandatory fields for the department of the certificate sought** (EXN 2). Mandatory columns are marked * in the table header and outlined in red after a refused export:

| Department | Certificates | Mandatory columns |
|---|---|---|
| Deck | Master, Chief Mate, Watchkeeping Mate (all), Fishing Master 1–4, Able Seafarer, Bridge Watch Rating | A capacity, B vessel, C official number, D vessel type, **G gross tonnage, H class of voyage**, I port of registry, J watch, P engagement, Q discharge, S days at sea |
| Engine | Engineer 1st–4th class (motor / steam), Watchkeeping Engineer fishing, SVMO, Engine-room Rating | A, B, C, D, **E main engine power (kW)**, I, J, P, Q, S |

- no ice-condition days exceed the line's days on board (`ICE_DAYS_EXCEED_ONBOARD`). Ice days themselves are optional. The excess is highlighted on the line (red ice-days box, red column R, message "More than days on board (n)") as the candidate types.

Save (in the browser) is always allowed. The application date is filled with today's date when empty and stays editable.

### Examiner

Export JSON and Export PDF / Print are refused until the examiner name is entered and, **on every line**, a review status is chosen and all five verification boxes are ticked, and no line has invalid values (including a service figure above the line's counted days). The review date shows today's date automatically (read-only) and is saved in `examinerAssessment.reviewDate`.

### File names

`CDN - SURNAME - UNVETTED QUALIFYING SEA SERVICE - ACRONYM - TOTAL OF X DAYS FROM YYYY-MM-DD TO YYYY-MM-DD` (candidate; X = total converted days)
`CDN - SURNAME - VETTED QUALIFYING SEA SERVICE - ACRONYM - TOTAL OF X DAYS FROM YYYY-MM-DD TO YYYY-MM-DD` (examiner; X = total final accepted days)

FROM = earliest engagement date, TO = latest discharge date on the record. Surname in capitals; characters not allowed in Windows file names are removed. The PDF name is suggested through the page title (Edge / Chrome "Save as PDF").

| Certificate | Acronym | Certificate | Acronym |
|---|---|---|---|
| Master Mariner | MM | First-class Engineer, Motor / Steam | 1EM / 1ES |
| Master, Near Coastal | MNC | Second-class Engineer, Motor / Steam | 2EM / 2ES |
| Master 3 000 GT, Near Coastal | M3000NC | Third-class Engineer, Motor / Steam | 3EM / 3ES |
| Master 500 GT, Near Coastal | M500NC | Fourth-class Engineer, Motor / Steam | 4EM / 4ES |
| Master 3 000 GT, Domestic | M3000D | Watchkeeping Engineer, Motor-driven Fishing Vessel | WKEF |
| Master 500 GT, Domestic | M500D | Small Vessel Machinery Operator | SVMO |
| Master 150 GT, Domestic | M150D | Engine-room Rating | ERR |
| Master, Limited | ML | Able Seafarer | AS |
| Chief Mate / Chief Mate, Near Coastal | CM / CMNC | Bridge Watch Rating | BWR |
| Watchkeeping Mate / … Near Coastal | WKM / WKMNC | Fishing Master 1st–4th class | FM1–FM4 |

*The acronyms are a proposal; confirm or correct them (`dev/js/recordRules.js`, `CERTIFICATE_INFO`).*

## 8. Decisions still to confirm (not implemented in v0.9.0)

These points are interpretations made for this build. Please confirm them with the examination unit:

1. **Day count (R1).** TP 2293 Table 1 subtracts the dates. Since v0.7.0 this count is also used on the production form, replacing its inclusive count (1–31 Jan was 31, now 30). Candidates whose engagement and discharge times justify an extra day need an examiner adjustment (s. 3.3(4) exception).
2. **Rounding down** to whole days, rather than rounding to nearest (the old production calculator used rounding to nearest).
3. **Choice of method.** The days-under-way method (s. 3.7) is applied whenever column S differs from R. If the vessel carried passengers or cargo, the examiner should use "Accepted with adjustment" and enter the final accepted days (the examiner basis was removed in v0.8.0).
4. **Junior officer.** MPR s. 117 is applied to the capacity "Supernumerary Mate" for every certificate type. The section refers to Master or Mate certificates.
5. **Backward compatibility (v0.9.0):** you said older records need not be guaranteed for this release; the existing conversion code was kept and still loads them, but it was not extended or re-verified beyond the existing tests. Ask again for the next version.
6. **Passenger, fishing, DP and offshore** — should they also get examiner-adjustable figures?
7. **Not yet implemented:** pilot service (s. 3.16, 2/3 up to 3 months), Canadian Forces rates (Table II), MOU Tables III–VI, approved training program remission (s. 3.22), fitting-out / lay-up / refit limits in the certificate tables, and certificate eligibility (minimum tonnage, voyage class, kW, months per certificate).
