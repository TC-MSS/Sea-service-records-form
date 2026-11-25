#!/usr/bin/env node
/**
 * Dependency checker for the Sea Service Records Form repository.
 *
 * Usage: node dev/tools/check-deps.mjs [repoRoot]
 *
 * - Starts from every HTML entry page (repo root and dev/).
 * - Follows <script src>, <link href>, ES-module import/export-from statements
 *   and fetch("...") calls to local files.
 * - Reports missing targets (exit code 1) and unreferenced files.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve, extname } from "node:path";

const root = resolve(process.argv[2] || join(dirname(new URL(import.meta.url).pathname), "..", ".."));
const IGNORE_DIRS = new Set([".git", "node_modules"]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const files = walk(root);
const rel = (p) => relative(root, p).split("\\").join("/");
const isLocal = (u) => u && !/^(https?:|data:|mailto:|#|\/\/)/i.test(u) && (/^[./]/.test(u) || !/^[@a-z]/i.test(u) || /\.(html|css|js|mjs|json)$/i.test(u));

function refsOf(file) {
  const src = readFileSync(file, "utf8");
  const ext = extname(file).toLowerCase();
  const refs = [];
  if (ext === ".html") {
    for (const m of src.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/gi)) refs.push({ kind: "script", url: m[1] });
    for (const m of src.matchAll(/<link[^>]*\shref=["']([^"']+)["']/gi)) refs.push({ kind: "link", url: m[1] });
    for (const m of src.matchAll(/<a[^>]*\shref=["']([^"']+\.html)["']/gi)) refs.push({ kind: "page-link", url: m[1] });
  }
  if (ext === ".js" || ext === ".mjs") {
    for (const m of src.matchAll(/(?:import|export)\s[^;]*?from\s*["']([^"']+)["']/g)) refs.push({ kind: "import", url: m[1] });
    for (const m of src.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) refs.push({ kind: "dynamic-import", url: m[1] });
    for (const m of src.matchAll(/fetch\(\s*["']([^"']+)["']/g)) refs.push({ kind: "fetch", url: m[1] });
  }
  return refs.filter((r) => isLocal(r.url) && !r.url.startsWith("node:"));
}

const entries = files.filter((f) => f.endsWith(".html"));
const graph = new Map();
const missing = [];
const reached = new Set();

function visit(file, from) {
  if (reached.has(file)) return;
  reached.add(file);
  const refs = refsOf(file);
  graph.set(rel(file), refs.map((r) => ({ ...r, target: rel(resolve(dirname(file), r.url.split("?")[0])) })));
  for (const r of refs) {
    const target = resolve(dirname(file), r.url.split("?")[0]);
    if (!existsSync(target)) { missing.push({ from: rel(file), kind: r.kind, url: r.url }); continue; }
    if (/\.(js|mjs|html)$/.test(target)) visit(target, file);
    else reached.add(target);
  }
}
entries.forEach((e) => visit(e));

// Tests and tools are their own entry points (Node), report them separately.
// Tools (this script) have no local dependencies and are marked reached directly.
files.filter((f) => /(^|\/)tests\//.test(rel(f)) && /\.(m?js)$/.test(f)).forEach((f) => visit(f));
files.filter((f) => /(^|\/)tools\//.test(rel(f))).forEach((f) => reached.add(f));

const docExt = new Set([".md", ".pdf", ".txt"]);
const unreferenced = files
  .filter((f) => !reached.has(f))
  .filter((f) => !docExt.has(extname(f).toLowerCase()) && !f.endsWith("package.json") && !rel(f).includes("/fixtures/"))
  .map(rel)
  .sort();

console.log(`Repository root: ${root}`);
console.log(`\nEntry pages: ${entries.map(rel).join(", ")}`);
console.log("\nReference graph:");
for (const [file, refs] of [...graph.entries()].sort()) {
  if (!refs.length) continue;
  console.log(`  ${file}`);
  for (const r of refs) console.log(`    -> [${r.kind}] ${r.target}`);
}
console.log(`\nUnreferenced files (${unreferenced.length}):`);
unreferenced.forEach((f) => console.log(`  - ${f}`));
if (missing.length) {
  console.log(`\nMISSING TARGETS (${missing.length}):`);
  missing.forEach((m) => console.log(`  ! ${m.from} [${m.kind}] ${m.url}`));
  process.exitCode = 1;
} else {
  console.log("\nAll local references resolve. OK");
}
