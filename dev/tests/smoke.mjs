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
await step("production form label reads 'Given Name' / 'Prénom'", async () => {
  assert.equal((await page.textContent("label[data-i18n=givenNames]")).trim(), "Given Name");
  await page.selectOption("#langSelector", "fr");
  assert.equal((await page.textContent("label[data-i18n=givenNames]")).trim(), "Prénom");
  await page.selectOption("#langSelector", "en");
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
  assert.equal(rec.voyages[0].dates.daysOnBoard, 19, "TP 2293 3.3(4)");
  assert.equal(rec.voyages[0].calculation.convertedDays, 19, "8 h: min(1.5 × 15, 19)");
});

await step("load legacy 0.4.0 fixture from browser storage", async () => {
  await page.evaluate((f) => { localStorage.setItem("SeaServiceRecord", JSON.stringify(f)); localStorage.removeItem("SeaServiceRecord.v0.5.0"); }, fixture);
  await page.click("#btnLoadCandidate");
  await page.waitForFunction(() => document.querySelectorAll("tr.voyageRow").length === 3);
  const status = await page.textContent("#statusPanel");
  assert.match(status, /0\.4\.0/);
});

await step("Converted days column follows 'Days at sea, if different' and shows TP 2293 values", async () => {
  const headers = await page.$$eval("#serviceTable thead th", (ths) => ths.map((t) => t.textContent.replace(/\s+/g, " ").trim()));
  const s = headers.findIndex((h) => h.includes("Days at sea, if different"));
  assert.ok(s > 0);
  assert.match(headers[s + 1], /Converted days/);
  const cells = await page.$$eval("td[data-col=convertedDays]", (tds) => tds.map((t) => t.textContent.trim()));
  assert.deepEqual(cells, ["30", "56", "43"]);
  const expl = await page.textContent(".reviewRow[data-index='1'] .calcText");
  assert.match(expl, /2\.25/);
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
  await page.fill("#finalAcceptedDays-0", "30");
  await page.check("#capacityVerified-0");
  await page.check("#specializedServiceVerified-0");
  const errs = await page.$$eval(".reviewRow[data-index='0'] .messages li.error", (ls) => ls.length);
  assert.equal(errs, 0);
});

await step("Converted days basis uses the calculated value", async () => {
  await page.selectOption("#examinerBasis-2", "CONVERTED_DAYS");
  assert.equal(await page.textContent(".reviewRow[data-index='2'] .basisDays"), "43");
  const codes = await page.$$eval(".reviewRow[data-index='2'] .messages li.error", (ls) => ls.map((l) => l.dataset.code));
  assert.ok(!codes.includes("CONVERTED_DAYS_NOT_CALCULATED"));
  await page.selectOption("#examinerBasis-2", "NONE");
});

await step("summary shows the four distinct totals", async () => {
  assert.equal(await page.textContent("#sumDaysOnBoard"), "98");
  assert.equal(await page.textContent("#sumDaysAtSea"), "84");
  assert.equal(await page.textContent("#sumConvertedDays"), "129");
  assert.equal(await page.textContent("#sumConvertedMonths"), "(4.3 months)");
  assert.equal(await page.textContent("#sumFinalAcceptedDays"), "50");
  assert.equal(await page.textContent("#sumReviewed"), "2");
});

await step("French: labels, months, input preserved across language switch", async () => {
  await page.selectOption("#langSelector", "fr");
  const labels = await page.$$eval(".reviewRow[data-index='0'] .verifyGrid label", (ls) => ls.map((l) => l.textContent.trim()));
  assert.ok(labels.includes("Fonction vérifiée"));
  assert.ok(labels.includes("Service spécialisé vérifié"));
  assert.equal((await page.textContent("dt[data-i18n=givenNames]")).trim(), "Prénom");
  assert.equal(await page.textContent("#sumConvertedMonths"), "(4,3 mois)");
  assert.match(await page.textContent(".reviewRow[data-index='1'] .calcText"), /jours crédités/);
  assert.equal(await page.inputValue("#adjustmentReason-1"), "Five days alongside for repairs.");
  assert.equal(await page.inputValue("#finalAcceptedDays-1"), "20");
  const opts = await page.$$eval("#examinerBasis-0 option", (os) => os.filter((o) => o.value !== "NONE").map((o) => o.textContent.trim()));
  assert.deepEqual(opts, ["Jours à bord", "Jours en mer", "Jours convertis", "Détermination manuelle"]);
  await page.selectOption("#langSelector", "en");
});

await step("save stores 0.5.0 draft separately with calculated days; candidate record untouched", async () => {
  const before = await page.evaluate(() => localStorage.getItem("SeaServiceRecord"));
  await page.click("#btnSave");
  const draft = JSON.parse(await page.evaluate(() => localStorage.getItem("SeaServiceRecord.v0.5.0")));
  const after = await page.evaluate(() => localStorage.getItem("SeaServiceRecord"));
  assert.equal(after, before);
  assert.equal(draft.schemaVersion, "0.5.0");
  assert.deepEqual(draft.voyages.map((v) => v.calculation.convertedDays), [30, 56, 43]);
  assert.strictEqual(draft.calculationSummary.automatedCalculation.totalConvertedDays, 129);
  assert.equal(draft.voyages[1].calculation.calculationRuleId, "TP2293-3.7(1)(b)");
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
  assert.equal(await page.textContent("#sumFinalAcceptedDays"), "50");
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


// ---------- Development candidate form ----------
await step("dev/index.html loads, converts the production record and shows Given Name", async () => {
  pageErrors.length = 0; notFound.length = 0;
  await page.evaluate((f) => { localStorage.setItem("SeaServiceRecord", JSON.stringify(f)); localStorage.removeItem("SeaServiceRecord.v0.5.0.candidate"); }, fixture);
  await page.goto(`${base}/dev/index.html`);
  await page.waitForFunction(() => window.__candidateDev?.getRecord());
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(notFound, []);
  assert.equal((await page.textContent("label[data-i18n=givenNames]")).trim(), "Given Name");
  assert.equal(await page.inputValue("#givenNames"), "Marie");
  const cells = await page.$$eval("td[data-col=convertedDays]", (tds) => tds.map((t) => t.textContent.trim()));
  assert.deepEqual(cells, ["30", "56", "43"]);
});

await step("candidate form calculates automatically as the candidate types", async () => {
  await page.click("#btnNew");
  await page.waitForFunction(() => window.__candidateDev.getRecord().voyages.length === 1 && !window.__candidateDev.getRecord().candidate.surname);
  await page.fill("#surname", "Roy");
  await page.fill("#givenNames", "Julie");
  const r1 = "#recordsBody tr:nth-child(1)";
  await page.selectOption(`${r1} [data-path='service.capacityCode']`, "CHIEF_MATE");
  await page.selectOption(`${r1} [data-path='service.watchHours']`, "12");
  await page.fill(`${r1} [data-path='dates.embarkationDate']`, "2025-01-01");
  await page.fill(`${r1} [data-path='dates.disembarkationDate']`, "2025-01-31");
  assert.equal(await page.textContent(`${r1} [data-col=daysOnBoard]`), "30");
  assert.equal(await page.textContent(`${r1} [data-col=convertedDays]`), "45");   // 30 × 1.5
  await page.fill(`${r1} [data-path='dates.daysAtSeaEntered']`, "10");
  assert.equal(await page.textContent(`${r1} [data-col=convertedDays]`), "22");   // min(2.25 × 10, 45)

  await page.click("#btnAdd");
  const r2 = "#recordsBody tr:nth-child(2)";
  await page.selectOption(`${r2} [data-path='service.capacityCode']`, "SUPERNUMERARY_MATE");
  await page.fill(`${r2} [data-path='dates.embarkationDate']`, "2025-01-20");
  await page.fill(`${r2} [data-path='dates.disembarkationDate']`, "2025-03-01");
  assert.equal(await page.textContent(`${r2} [data-col=convertedDays]`), "26");   // 40 × 2/3 = 26.67
  const codes = await page.$$eval("#findings li.warning", (ls) => ls.map((l) => l.dataset.code));
  assert.ok(codes.includes("OVERLAPPING_SERVICE"));
  assert.ok(codes.includes("JUNIOR_OFFICER_9_MONTH_LIMIT"));
  assert.ok(codes.includes("ATTESTATION_REQUIRED_OVER_8H"));
  assert.equal(await page.textContent("#sumConvertedDays"), "48");
  assert.equal(await page.textContent("#sumOverlap"), "11");
});

await step("candidate form: French labels and manual review display", async () => {
  await page.selectOption("#langSelector", "fr");
  assert.equal((await page.textContent("label[data-i18n=givenNames]")).trim(), "Prénom");
  assert.equal(await page.inputValue("#givenNames"), "Julie");
  const r2 = "#recordsBody tr:nth-child(2)";
  await page.selectOption(`${r2} [data-path='vessel.vesselTypeCode']`, "MOU");
  assert.equal(await page.textContent(`${r2} [data-col=convertedDays]`), "Examen manuel");
  await page.selectOption(`${r2} [data-path='vessel.vesselTypeCode']`, "CARGO");
  await page.selectOption("#langSelector", "en");
});

await step("candidate save uses its own key; examiner loads it with calculated days", async () => {
  const before = await page.evaluate(() => localStorage.getItem("SeaServiceRecord"));
  await page.click("#btnSave");
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem("SeaServiceRecord.v0.5.0.candidate")));
  assert.equal(await page.evaluate(() => localStorage.getItem("SeaServiceRecord")), before);
  assert.equal(saved.candidate.givenNames, "Julie");
  assert.deepEqual(saved.voyages.map((v) => v.calculation.convertedDays), [22, 26]);
  await page.goto(`${base}/dev/examiner.html`);
  await page.waitForFunction(() => window.__examinerDev);
  await page.click("#btnLoadCandidate");
  await page.waitForFunction(() => window.__examinerDev.getRecord()?.candidate.surname === "Roy");
  const cells = await page.$$eval("td[data-col=convertedDays]", (tds) => tds.map((t) => t.textContent.trim()));
  assert.deepEqual(cells, ["22", "26"]);
});

await step("no uncaught script errors during the dev session", async () => {
  assert.deepEqual(pageErrors, []);
});

await page.screenshot({ path: join(here, "smoke-examiner.png"), fullPage: true });
await page.goto(`${base}/dev/index.html`);
await page.waitForFunction(() => window.__candidateDev?.getRecord());
await page.screenshot({ path: join(here, "smoke-candidate.png"), fullPage: true });
await browser.close();
server.close();

for (const [s, n, m] of results) console.log(`${s}  ${n}${m ? "  — " + m : ""}`);
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} smoke tests passed.`);
process.exitCode = failed ? 1 : 0;
