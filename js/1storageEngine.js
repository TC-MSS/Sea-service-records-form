import { migrateRecordToV050 } from "./migrationEngine.js";
const KEY = "SeaServiceRecord.v0.5.0";
export function saveRecord(record) { record.updatedAt = new Date().toISOString(); localStorage.setItem(KEY, JSON.stringify(record)); }
export function loadRecord() { const raw = localStorage.getItem(KEY) || localStorage.getItem("SeaServiceRecord"); return raw ? migrateRecordToV050(JSON.parse(raw)) : null; }
export function exportRecord(record) { return JSON.stringify(record, null, 2); }
export function importRecord(json) { return migrateRecordToV050(JSON.parse(json)); }
