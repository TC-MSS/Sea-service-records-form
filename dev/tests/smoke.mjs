/**
 * Browser smoke tests (Playwright + Chromium).
 * Serves the repository root over HTTP (ES modules do not load from file://),
 * then exercises production index.html (regression only) and dev/examiner.html.
 *
 * Run from dev/: node tests/smoke.mjs
 * Requires: npm i -D playwright && npx playwright install chromium (if not already available)
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = await import("playwright")); } catch { ({ chromium } = require("playwright")); }

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json" };

const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = resolve(repoRoot, "." + path);
    if (!file.startsWith(repoRoot)) throw new Error("outside root");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("not found"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const fixture = JSON.parse(await readFile(join(here, "fixtures", "legacy-v0.4.0.json"), "utf8"));
const preFixture = join(here, "fixtures", "legacy-pre-0.4.json");

const browser = await chromium.launch();
const results = [];
async function step(name, fn) {
  try { await fn(); results.push(["PASS", name]); }
  catch (e) { results.push(["FAIL", name, e.message.split("\n")[0]]); }
}

const context = await browser.newContext();
const page = await context.newPage();
const pageErrors = [];
const notFound = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
page.on("response", (r) => { if (r.status() === 404) notFound.push(r.url()); });
page.on("dialog", (d) => d.accept());

// ---------- Production regression (read-only, nothing modified) ----------
await step("production index.html loads without script errors or 404s", async () => {
  await page.goto(`${base}/index.html`);
  await page.waitForSelector("#recordsBody tr");
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(notFound, []);
});
await step("production candidate form saves a 0.4.0 record under 'SeaServiceRecord'", async () => {
  const row = page.locator("#recordsBody tr").first();
  await row.locator(".rank").selectOption("MATE");
  await row.locator(".vessel").fill("Smoke Vessel");
  await row.locator(".gt").fill("600");
  await row.locator(".embark").fill("2025-01-01");
  await row.locator(".disembark").fill("2025-01-20");
  await row.locator(".daysAtSea").fill("15");
  await row.locator(".daysAtSea").dispatchEvent("change");
  assert.equal(await row.locator(".daysOnBoardCell").textContent(), "20");
  await page.click("button[data-i18n=save]");
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem("SeaServiceRecord")));
  assert.equal(saved.schemaVersion, "0.4.0");
  assert.equal(saved.voyages[0].daysAtSea, 15);
});

// ---------- Development examiner page ----------
await step("dev/examiner.html loads without script errors or 404s", async () => {
  pageErrors.length = 0; notFound.length = 0;
  await page.goto(`${base}/dev/examiner.html`);
  await page.waitForFunction(() => window.__examinerDev);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(notFound, []);
});
await step("end-to-end: examiner loads the record saved by production index.html", async () => {
  await page.click("#btnLoadCandidate");
  await page.waitForSelector("tr.voyageRow");
  const rec = await page.evaluate(() => window.__examinerDev.getRecord());
  assert.equal(rec.schemaVersion, "0.5.0");
  assert.equal(rec.voyages[0].vessel.vesselName, "Smoke Vessel");
  assert.equal(rec.voyages[0].dates.daysAtSeaEntered, 15);
});

await step("load legacy 0.4.0 fixture from browser storage", async () => {
  await page.evaluate((f) => { localStorage.setItem("SeaServiceRecord", JSON.stringify(f)); localStorage.removeItem("SeaServiceRecord.v0.5.0"); }, fixture);
  await page.click("#btnLoadCandidate");
  await page.waitForFunction(() => document.querySelectorAll("tr.voyageRow").length === 3);
  const status = await page.textContent("#statusPanel");
  assert.match(status, /0\.4\.0/);
});

await step("Converted days column follows 'Days at sea, if different' and shows Not calculated", async () => {
  const headers = await page.$$eval("#serviceTable thead th", (ths) => ths.map((t) => t.textContent.replace(/\s+/g, " ").trim()));
  const s = headers.findIndex((h) => h.includes("Days at sea, if different"));
  assert.ok(s > 0);
  assert.match(headers[s + 1], /Converted days/);
  const cells = await page.$$eval("td[data-col=convertedDays]", (tds) => tds.map((t) => t.textContent.trim()));
  assert.deepEqual(cells, ["Not calculated", "Not calculated", "Not calculated"]);
  const atSea = await page.$$eval("td[data-col=daysAtSea]", (tds) => tds.map((t) => t.textContent.trim()));
  assert.deepEqual(atSea, ["", "25", ""]);
});

await step("'Capacity verified' and 'Specialized service verified' are in the page markup (EN)", async () => {
  const html = await (await fetch(`${base}/dev/examiner.html`)).text();
  assert.ok(html.includes(">Capacity verified<"));
  assert.ok(html.includes(">Specialized service verified<"));
  const labels = await page.$$eval(".reviewRow .verifyGrid label", (ls) => ls.map((l) => l.textContent.trim()));
  assert.ok(labels.includes("Capacity verified"));
  assert.ok(labels.includes("Specialized service verified"));
  assert.ok(!(await page.content()).includes("examiner-labels.js"), "legacy replacement script not used");
});

await step("examiner controls exist on every line with the four basis options", async () => {
  for (const f of ["reviewStatus", "examinerBasis", "finalAcceptedDays", "adjustmentReason", "examinerComments"]) {
    assert.equal(await page.locator(`.reviewRow [data-field=${f}]`).count(), 3, f);
  }
  const opts = await page.$$eval("#examinerBasis-0 option", (os) => os.filter((o) => o.value !== "NONE").map((o) => o.textContent.trim()));
  assert.deepEqual(opts, ["Days on board", "Days at sea", "Converted days", "Manual determination"]);
});

await step("adjustment reason is required when final days differ from basis", async () => {
  await page.selectOption("#reviewStatus-1", "ACCEPTED_WITH_ADJUSTMENT");
  await page.selectOption("#examinerBasis-1", "DAYS_AT_SEA");
  assert.equal(await page.textContent(".reviewRow[data-index='1'] .basisDays"), "25");
  await page.fill("#finalAcceptedDays-1", "20");
  const codes = await page.$$eval(".reviewRow[data-index='1'] .messages li.error", (ls) => ls.map((l) => l.dataset.code));
  assert.ok(codes.includes("ADJUSTMENT_REASON_REQUIRED"), codes.join());
  assert.equal(await page.getAttribute("#adjustmentReason-1", "aria-invalid"), "true");
  await page.fill("#adjustmentReason-1", "Five days alongside for repairs.");
  const after = await page.$$eval(".reviewRow[data-index='1'] .messages li.error", (ls) => ls.map((l) => l.dataset.code));
  assert.deepEqual(after, []);
});

await step("no reason needed when final days equal the basis", async () => {
  await page.selectOption("#reviewStatus-0", "ACCEPTED");
  await page.selectOption("#examinerBasis-0", "DAYS_ON_BOARD");
  await page.fill("#finalAcceptedDays-0", "31");
  await page.check("#capacityVerified-0");
  await page.check("#specializedServiceVerified-0");
  const errs = await page.$$eval(".reviewRow[data-index='0'] .messages li.error", (ls) => ls.length);
  assert.equal(errs, 0);
});

await step("Converted days basis is flagged as not calculated", async () => {
  await page.selectOption("#examinerBasis-2", "CONVERTED_DAYS");
  assert.equal(await page.textContent(".reviewRow[data-index='2'] .basisDays"), "Not calculated");
  const codes = await page.$$eval(".reviewRow[data-index='2'] .messages li.error", (ls) => ls.map((l) => l.dataset.code));
  assert.ok(codes.includes("CONVERTED_DAYS_NOT_CALCULATED"));
  await page.selectOption("#examinerBasis-2", "NONE");
});

await step("summary shows the four distinct totals", async () => {
  assert.equal(await page.textContent("#sumDaysOnBoard"), "101");
  assert.equal(await page.textContent("#sumDaysAtSea"), "86");
  assert.equal(await page.textContent("#sumConvertedDays"), "Not calculated");
  assert.equal(await page.textContent("#sumFinalAcceptedDays"), "51");
  assert.equal(await page.textContent("#sumReviewed"), "2");
});

await step("French: labels, Non calculé, input preserved across language switch", async () => {
  await page.selectOption("#langSelector", "fr");
  const labels = await page.$$eval(".reviewRow[data-index='0'] .verifyGrid label", (ls) => ls.map((l) => l.textContent.trim()));
  assert.ok(labels.includes("Fonction vérifiée"));
  assert.ok(labels.includes("Service spécialisé vérifié"));
  assert.equal((await page.textContent("td[data-col=convertedDays]")).trim(), "Non calculé");
  assert.equal(await page.textContent("#sumConvertedDays"), "Non calculé");
  assert.equal(await page.inputValue("#adjustmentReason-1"), "Five days alongside for repairs.");
  assert.equal(await page.inputValue("#finalAcceptedDays-1"), "20");
  const opts = await page.$$eval("#examinerBasis-0 option", (os) => os.filter((o) => o.value !== "NONE").map((o) => o.textContent.trim()));
  assert.deepEqual(opts, ["Jours à bord", "Jours en mer", "Jours convertis", "Détermination manuelle"]);
  await page.selectOption("#langSelector", "en");
});

await step("save stores 0.5.0 draft separately; converted days stored as null; candidate record untouched", async () => {
  const before = await page.evaluate(() => localStorage.getItem("SeaServiceRecord"));
  await page.click("#btnSave");
  const draft = JSON.parse(await page.evaluate(() => localStorage.getItem("SeaServiceRecord.v0.5.0")));
  const after = await page.evaluate(() => localStorage.getItem("SeaServiceRecord"));
  assert.equal(after, before);
  assert.equal(draft.schemaVersion, "0.5.0");
  draft.voyages.forEach((v) => assert.strictEqual(v.calculation.convertedDays, null));
  assert.strictEqual(draft.calculationSummary.automatedCalculation.totalConvertedDays, null);
  assert.equal(draft.voyages[1].examinerReview.finalAcceptedDays, 20);
  assert.equal(draft.voyages[1].examinerReview.adjustmentReason, "Five days alongside for repairs.");
  assert.equal(draft.voyages[0].examinerReview.capacityVerified, true);
});

await step("reload restores the examiner draft", async () => {
  await page.reload();
  await page.click("#btnLoadDraft");
  await page.waitForSelector("tr.voyageRow");
  assert.equal(await page.inputValue("#finalAcceptedDays-1"), "20");
  assert.equal(await page.isChecked("#capacityVerified-0"), true);
  assert.equal(await page.textContent("#sumFinalAcceptedDays"), "51");
});

await step("import pre-0.4 JSON: legacy positionVerified/seaServiceVerified/polar/ice/DP/offshore/tanker", async () => {
  await page.setInputFiles("#fileImport", preFixture);
  await page.waitForFunction(() => window.__examinerDev.getRecord()?.candidate.surname === "Smith");
  assert.equal(await page.isChecked("#capacityVerified-0"), true);
  assert.equal(await page.isChecked("#specializedServiceVerified-0"), true);
  const spec = (await page.textContent("tr.voyageRow[data-index='0'] td.specialized")).replace(/\s+/g, " ");
  assert.match(spec, /Polar waters and acceptable ice service/);
  assert.match(spec, /Dynamic positioning and offshore service/);
  const codes = await page.$$eval(".reviewRow[data-index='0'] .messages li.warning", (ls) => ls.map((l) => l.dataset.code));
  assert.ok(codes.includes("TRANSFER_OPERATION_TYPE_REQUIRED"));
  assert.equal((await page.textContent("tr.voyageRow[data-index='1'] td[data-col=daysOnBoard]")).trim(), "45");
});

await step("no uncaught script errors during the dev session", async () => {
  assert.deepEqual(pageErrors, []);
});

await page.screenshot({ path: join(here, "smoke-examiner.png"), fullPage: true });
await browser.close();
server.close();

for (const [s, n, m] of results) console.log(`${s}  ${n}${m ? "  — " + m : ""}`);
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} smoke tests passed.`);
process.exitCode = failed ? 1 : 0;
