#!/usr/bin/env node
/**
 * Syntax checker: JavaScript (node --check, ESM-aware), JSON (parse) and
 * basic HTML hygiene (DOCTYPE first, balanced <script> tags).
 * Usage: node dev/tools/check-syntax.mjs [repoRoot]
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, dirname, relative, resolve, extname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const root = resolve(process.argv[2] || join(dirname(new URL(import.meta.url).pathname), "..", ".."));
const walk = (d) => readdirSync(d).flatMap((n) => {
  if (n === ".git" || n === "node_modules") return [];
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const tmp = mkdtempSync(join(tmpdir(), "syntax-"));
let failures = 0;
const report = (ok, file, note = "") => { if (!ok) failures++; console.log(`${ok ? "OK  " : "FAIL"} ${relative(root, file)}${note ? "  " + note : ""}`); };

for (const file of walk(root)) {
  const ext = extname(file).toLowerCase();
  const src = readFileSync(file, "utf8");
  if (ext === ".js" || ext === ".mjs") {
    const isModule = ext === ".mjs" || /^\s*(import|export)\s/m.test(src);
    const probe = join(tmp, `probe${isModule ? ".mjs" : ".cjs"}`);
    writeFileSync(probe, src);
    const r = spawnSync(process.execPath, ["--check", probe], { encoding: "utf8" });
    report(r.status === 0, file, (isModule ? "(module)" : "(classic)") + (r.status ? "\n" + r.stderr.split("\n").slice(0, 4).join("\n") : ""));
  } else if (ext === ".json") {
    if (!src.trim()) { report(true, file, "(empty — placeholder)"); continue; }
    try { JSON.parse(src); report(true, file); } catch (e) { report(false, file, e.message); }
  } else if (ext === ".html") {
    if (!src.trim()) { report(true, file, "(empty file — WARNING)"); continue; }
    const notes = [];
    if (!/^\s*<!DOCTYPE html>/i.test(src)) notes.push("WARNING: <!DOCTYPE html> is not the first token (quirks mode)");
    const open = (src.match(/<script\b/gi) || []).length, close = (src.match(/<\/script>/gi) || []).length;
    const ok = open === close;
    if (!ok) notes.push(`unbalanced <script> tags (${open}/${close})`);
    report(ok, file, notes.join("; "));
  }
}
console.log(failures ? `\n${failures} syntax failure(s).` : "\nAll syntax checks passed.");
process.exitCode = failures ? 1 : 0;
