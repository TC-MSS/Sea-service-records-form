/**
 * Storage engine — v0.5.0 development build.
 *
 * The production candidate form (index.html) saves under "SeaServiceRecord"
 * (schema 0.4.0). This module NEVER writes to that key; examiner drafts are
 * kept under "SeaServiceRecord.v0.5.0" so production data is untouched.
 */
import { migrateRecordToV050 } from "./migrationEngine.js";

export const LEGACY_KEY = "SeaServiceRecord";
export const KEY = "SeaServiceRecord.v0.5.0";

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

/** Read the production candidate record read-only and migrate it in memory. */
export function loadCandidateRecord() {
  const raw = store().getItem(LEGACY_KEY);
  return raw ? migrateRecordToV050(JSON.parse(raw)) : null;
}

export function exportRecord(record) { return JSON.stringify(record, null, 2); }
export function importRecord(json) { return migrateRecordToV050(JSON.parse(json)); }
