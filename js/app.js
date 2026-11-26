/**
 * Production candidate form — v0.7.0 entry point (loaded by index.html).
 *
 * The form controller, the TP 2293 / MPR calculation (tp2293Engine.js), validation,
 * migration of older records and storage are the shared modules in dev/js, so the
 * production page applies exactly the same rules as dev/examiner.html.
 * <body data-variant="production"> selects the production page title.
 *
 * Replaces the 0.4.0 controller (schema 0.4.0, js/seaServiceCalculator.js), which
 * is no longer loaded. Records saved by the 0.4.0 page under "SeaServiceRecord"
 * still load (converted in memory, never overwritten); new saves use the 0.5.0
 * schema under "SeaServiceRecord.v0.5.0.candidate".
 */
import "../dev/js/candidate.js";
