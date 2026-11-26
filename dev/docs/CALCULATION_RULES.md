# Sea Service Calculation Rules — v0.7.0

Rules version stored with every calculated line (`calculation.calculationRuleVersion`): `TP2293-CH3_MPR-115-117_v1.0` — unchanged in v0.7.0 (`dev/js/tp2293Engine.js` was not modified).

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

## 5. Examiner determination (v0.7.0)

The TP 2293 figure is a reference. The examiner's **Final accepted days** override days on board, days at sea and converted days.

| Situation | Figure counted in "Total final accepted days" |
|---|---|
| Rejected | 0 (whatever is typed in Final accepted days — a warning says so) |
| Final accepted days entered (any other status) | the final accepted days |
| Accepted / Accepted with adjustment, no final days | the reference value (warning shown); 0 if there is none |
| Not reviewed / Additional information required, no final days | 0 |
| Final days negative or not a whole number | 0, and an error on the line |

**Reference value** = the days of the selected basis (Days on board, Days at sea, Converted days). The basis is optional; with no basis the reference is the calculated converted days. "Manual determination" has no reference value.

**Adjustment reason** is needed when the final days differ from the reference value, when there is no reference value (manual-review line, manual determination), or when the status is "Accepted with adjustment". A missing reason is a **warning** (red field and red message, counted in "Lines missing an adjustment reason"). It never blocks saving.

**Automatic status (decision 4(d), confirmed 2026-11-25):** typing final days on a "Not reviewed" line sets the status to "Accepted" (final = reference) or "Accepted with adjustment" (final ≠ reference) and shows a notice. While the status is automatic it follows later changes to the final days; clearing the final days returns the line to "Not reviewed". Choosing a status by hand ends the automatic mode. A line cannot stay "Not reviewed" while it has final days.

The summary shows the total final accepted days, months (÷ 30, rounded down to 2 decimals) and the **difference from the total converted days** (final − converted; negative in red, positive in green).

## 6. Column K — ice service (v0.7.0)

Column K keeps the two conditions (Polar waters; Acceptable ice service). Both can be selected, and each has its own number of days entered by the candidate. Typing days ticks the condition; unticking clears the days.

Stored as `specializedService.iceConditions = { POLAR: {selected, days}, ACCEPTABLE_ICE: {selected, days} }`. The older single code `specializedService.iceService` (NONE / POLAR / ACCEPTABLE_ICE / POLAR_AND_ACCEPTABLE_ICE) is still written, derived from the selection, so older tools keep reading it. Older records convert to selected conditions with days blank.

Checks: condition selected without days → warning `ICE_DAYS_NOT_STATED`; days above days on board → error `ICE_DAYS_EXCEED_ONBOARD`; negative or fractional days → error `ICE_DAYS_INVALID`. The ice days are not converted and do not change column T; they are totalled in the summary ("Polar waters (days entered)", "Acceptable ice service (days entered)") for the examiner. The two conditions may overlap, so no combined limit is applied.

## 7. Decisions still to confirm (unchanged since v0.6.0 — not implemented in v0.7.0)

These points are interpretations made for this build. Please confirm them with the examination unit:

1. **Day count (R1).** TP 2293 Table 1 subtracts the dates. Since v0.7.0 this count is also used on the production form, replacing its inclusive count (1–31 Jan was 31, now 30). Candidates whose engagement and discharge times justify an extra day need an examiner adjustment (s. 3.3(4) exception).
2. **Rounding down** to whole days, rather than rounding to nearest (the old production calculator used rounding to nearest).
3. **Choice of method.** The days-under-way method (s. 3.7) is applied whenever column S differs from R. If the vessel carried passengers or cargo, the examiner should choose basis "Days on board" instead.
4. **Junior officer.** MPR s. 117 is applied to the capacity "Supernumerary Mate" for every certificate type. The section refers to Master or Mate certificates.
5. **Not yet implemented:** pilot service (s. 3.16, 2/3 up to 3 months), Canadian Forces rates (Table II), MOU Tables III–VI, approved training program remission (s. 3.22), fitting-out / lay-up / refit limits in the certificate tables, and certificate eligibility (minimum tonnage, voyage class, kW, months per certificate).
