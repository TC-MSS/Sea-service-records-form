/**
 * Storage engine — v0.7.0.
 *
 * Every record stays in the individual's browser (localStorage); nothing is sent
 * anywhere. Records travel between candidate and examiner as exported JSON files.
 *
 *  - "SeaServiceRecord.v0.5.0.candidate" — candidate record, written by the production
 *    candidate form (index.html, from v0.7.0) and the development candidate form.
 *  - "SeaServiceRecord.v0.5.0"           — examiner draft (dev/examiner.html).
 *  - "SeaServiceRecord"                  — record saved by the production form before v0.7.0
 *    (schema 0.4.0). Read and converted in memory only; this module NEVER writes to it,
 *    so rolling back to the old page still finds it.
 */
import { migrateRecordToV050 } from "./migrationEngine.js";

export const LEGACY_KEY = "SeaServiceRecord";
export const KEY = "SeaServiceRecord.v0.5.0";
/** Written by the development candidate form (dev/index.html). */
export const CANDIDATE_KEY = "SeaServiceRecord.v0.5.0.candidate";

function store() { return globalThis.localStorage; }

export function saveRecord(record) {
  record.updatedAt = new Date().toISOString();
  store().setItem(KEY, JSON.stringify(record));
}

/** Load the examiner draft (0.5.0) if present, otherwise the candidate record. */
export function loadRecord() {
  return loadExaminerDraft() || loadCandidateRecord();
}

export function loadExaminerDraft() {
  const raw = store().getItem(KEY);
  return raw ? migrateRecordToV050(JSON.parse(raw)) : null;
}

/**
 * Candidate record: the development candidate form (0.5.0) first, otherwise the
 * production record (0.4.0), read-only and migrated in memory.
 */
export function loadCandidateRecord() {
  const raw = store().getItem(CANDIDATE_KEY) || store().getItem(LEGACY_KEY);
  return raw ? migrateRecordToV050(JSON.parse(raw)) : null;
}

/** Save from the development candidate form. Never touches the production key. */
export function saveCandidateRecord(record) {
  record.updatedAt = new Date().toISOString();
  store().setItem(CANDIDATE_KEY, JSON.stringify(record));
}

export function exportRecord(record) { return JSON.stringify(record, null, 2); }
export function importRecord(json) { return migrateRecordToV050(JSON.parse(json)); }
