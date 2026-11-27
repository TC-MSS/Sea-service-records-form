/**
 * Browser smoke tests (Playwright + Chromium).
 * Serves the repository root over HTTP (ES modules do not load from file://),
 * then exercises production index.html (regression only) and dev/examiner.html.
 *
 * Run from dev/: node tests/smoke.mjs
 * Requires: npm i -D playwright && npx playwright install chromium (if not already available)
 */
import { createServer } from "node:http";
import { readFile, unlink } from "node:fs/promises";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";

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
  catch (e) { results.push(["FAIL", name, e.message.split("\n").slice(0, 6).join(" ")]); }
}

const context = await browser.newContext();
const page = await context.newPage();
const pageErrors = [];
const notFound = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
page.on("response", (r) => { if (r.status() === 404) notFound.push(r.url()); });
page.on("dialog", (d) => d.accept());

// ---------- Production candidate page (v0.7.0: shared TP 2293 engine) ----------
const CANDIDATE_KEY = "SeaServiceRecord.v0.5.0.candidate";
const requested = [];
page.on("request", (r) => requested.push(r.url()));

await step("production index.html loads without script errors or 404s; old calculator not loaded", async () => {
  await page.goto(`${base}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__candidateDev?.getRecord());
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(notFound, []);
  assert.ok(requested.some((u) => u.endsWith("/dev/js/tp2293Engine.js")), "shared engine loaded");
  for (const old of ["seaServiceCalculator.js", "certificateRules.js", "/js/validationEngine.js", "/js/storageEngine.js"]) {
    assert.ok(!requested.some((u) => u.endsWith(old) && !u.includes("/dev/")), `${old} must not be loaded`);
  }
  assert.equal(await page.evaluate(() => document.compatMode), "CSS1Compat", "standards mode (no quirks)");
});
await step("production label 'Given Name' / 'Prénom'; title has no 'development'", async () => {
  assert.equal((await page.textContent("label[data-i18n=givenNames]")).trim(), "Given Name");
  assert.equal(await page.title(), "Statement of Sea Service for a Certificate");
  await page.selectOption("#langSelector", "fr");
  assert.equal((await page.textContent("label[data-i18n=givenNames]")).trim(), "Prénom");
  assert.equal(await page.title(), "État de service en mer pour un brevet");
  await page.selectOption("#langSelector", "en");
});
await step("production shows the UNVETTED label in English and French", async () => {
  const boxes = await page.$$eval(".unvettedBox", (bs) => bs.map((b) => b.textContent.replace(/\s+/g, " ").trim()));
  assert.equal(boxes.length, 2);
  for (const b of boxes) {
    assert.match(b, /Unvetted sea service — subject to examiner review/);
    assert.match(b, /Service en mer non vérifié — sous réserve de l’examen par l’examinateur/);
  }
  const headers = await page.$$eval("#serviceTable thead th", (ths) => ths.map((t) => t.textContent.replace(/\s+/g, " ").trim()));
  const s = headers.findIndex((h) => /Days at sea$/.test(h));
  assert.match(headers[s + 1], /Converted days \(unvetted\)$/);
  assert.equal(await page.locator("text=Examiner Validation").count(), 0, "examiner-only section removed");
});
await step("production loads the 0.4.0 record saved before this release (R per TP 2293 s. 3.3(4))", async () => {
  await page.evaluate((f) => { localStorage.setItem("SeaServiceRecord", JSON.stringify(f)); }, fixture);
  await page.reload();
  await page.waitForFunction(() => window.__candidateDev?.getRecord()?.candidate.surname === "Tremblay");
  const r = await page.$$eval("td[data-col=daysOnBoard]", (tds) => tds.map((t) => t.textContent.trim()));
  assert.deepEqual(r, ["30", "39", "29"]);
  const tcol = await page.$$eval("td[data-col=convertedDays]", (tds) => tds.map((t) => t.textContent.trim()));
  assert.deepEqual(tcol, ["30", "56", "43"], "same figures as the examiner page");
  const title = await page.getAttribute("#recordsBody tr:nth-child(2) td[data-col=convertedDays] span", "title");
  assert.match(title, /2\.25/);
  assert.equal(await page.locator("#findings li.explain").count(), 3, "explanation line per line under the table");
  assert.equal(await page.textContent("#sumDaysOnBoard"), "98");
  assert.equal(await page.textContent("#sumDaysAtSea"), "84");
  assert.equal(await page.textContent("#sumConvertedDays"), "129");
  assert.equal(await page.textContent("#sumConvertedMonths"), "(4.3 months)");
  assert.equal(await page.textContent("#sumManual"), "0");
  assert.equal(await page.textContent("#sumOverlap"), "0");
});
await step("production column K: several ice conditions with days", async () => {
  const r2 = "#recordsBody tr:nth-child(2)";
  assert.equal(await page.isChecked(`${r2} [data-path='specializedService.iceConditions.POLAR.selected']`), true, "legacy POLAR kept");
  await page.fill(`${r2} [data-path='specializedService.iceConditions.POLAR.days']`, "12");
  await page.fill(`${r2} [data-path='specializedService.iceConditions.ACCEPTABLE_ICE.days']`, "20");
  assert.equal(await page.isChecked(`${r2} [data-path='specializedService.iceConditions.ACCEPTABLE_ICE.selected']`), true, "days tick the condition");
  assert.equal(await page.textContent("#sumPolarDays"), "12");
  assert.equal(await page.textContent("#sumIceDays"), "20");
  await page.fill(`${r2} [data-path='specializedService.iceConditions.ACCEPTABLE_ICE.days']`, "45");
  const codes = await page.$$eval("#findings li.error", (ls) => ls.map((l) => l.dataset.code));
  assert.ok(codes.includes("ICE_DAYS_EXCEED_ONBOARD"));
  await page.fill(`${r2} [data-path='specializedService.iceConditions.ACCEPTABLE_ICE.days']`, "20");
  const rec = await page.evaluate(() => window.__candidateDev.getRecord());
  assert.equal(rec.voyages[1].specializedService.iceService, "POLAR_AND_ACCEPTABLE_ICE");
});
await step("production save: 0.5.0 under the candidate key; old 'SeaServiceRecord' never overwritten", async () => {
  const before = await page.evaluate(() => localStorage.getItem("SeaServiceRecord"));
  await page.click("#btnSave");
  const saved = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), CANDIDATE_KEY));
  assert.equal(await page.evaluate(() => localStorage.getItem("SeaServiceRecord")), before);
  assert.equal(saved.schemaVersion, "0.5.0");
  assert.equal(saved.applicationVersion, "0.9.0");
  assert.deepEqual(saved.voyages.map((v) => v.calculation.convertedDays), [30, 56, 43]);
  assert.deepEqual(saved.voyages[1].specializedService.iceConditions, { POLAR: { selected: true, days: 12 }, ACCEPTABLE_ICE: { selected: true, days: 20 } });
  await page.reload();
  await page.waitForFunction(() => window.__candidateDev?.getRecord());
  assert.equal(await page.inputValue("#recordsBody tr:nth-child(2) [data-path='specializedService.iceConditions.POLAR.days']"), "12");
});
await step("v0.8.0 item 1: capacity 'Mate in Charge of a Watch' / 'Officier de pont en charge du quart à la passerelle'", async () => {
  const sel = "#recordsBody tr:nth-child(1) [data-path='service.capacityCode']";
  assert.equal(await page.$eval(sel, (s) => s.options[s.selectedIndex].textContent.trim()), "Mate in Charge of a Watch");
  await page.selectOption("#langSelector", "fr");
  assert.equal(await page.$eval(sel, (s) => s.options[s.selectedIndex].textContent.trim()), "Officier de pont en charge du quart à la passerelle");
  await page.selectOption("#langSelector", "en");
});
await step("v0.9.0 items 6 and 8: reminder next to the export buttons; NC1 spelled out", async () => {
  const rem = await page.textContent(".reminder");
  assert.match(rem, /saved only in this browser/);
  assert.match(rem, /local Transport Canada Centre/);
  assert.match(rem, /JSON file.*discharge book entries.*testimonials/s);
  const voy = "#recordsBody tr:nth-child(1) [data-path='vessel.voyageClassification']";
  assert.equal(await page.$eval(voy, (s) => s.options[s.selectedIndex].textContent.trim()), "Near Coastal, Class 1");
  await page.selectOption("#langSelector", "fr");
  assert.equal(await page.$eval(voy, (s) => s.options[s.selectedIndex].textContent.trim()), "À proximité du littoral, classe 1");
  assert.match(await page.textContent(".reminder"), /centre de Transports Canada local/);
  await page.selectOption("#langSelector", "en");
});
await step("v0.8.0/v0.9.0: export blocked without the declaration and mandatory fields (S days at sea); caution shown", async () => {
  await page.uncheck("#applicantDeclaration");
  assert.equal(await page.isVisible(".declarationCaution"), true, "caution shown while unticked");
  let downloaded = false;
  const onDl = () => { downloaded = true; };
  page.on("download", onDl);
  await page.click("#btnExport");
  await page.waitForTimeout(400);
  page.off("download", onDl);
  assert.equal(downloaded, false, "no file exported");
  assert.match(await page.textContent("#statusPanel"), /Export blocked/);
  const codes = await page.$$eval("#statusPanel li", (ls) => ls.map((l) => `${l.dataset.code}${l.dataset.line ? ":" + l.dataset.line : ""}`));
  assert.deepEqual(codes, ["DECLARATION_REQUIRED", "MISSING:1", "MISSING:3"], "older record: S blank on lines 1 and 3");
  assert.match(await page.textContent("#statusPanel"), /Line 1: mandatory field\(s\) missing — S/);
  assert.match(await page.getAttribute("#declarationSection", "class"), /declarationMissing/);
  assert.match(await page.getAttribute("#recordsBody tr:nth-child(1) [data-path='dates.daysAtSeaEntered']", "class"), /missingField/);
  await page.check("#applicantDeclaration");
  assert.equal(await page.isVisible(".declarationCaution"), false, "caution hidden once ticked");
  await page.fill("#recordsBody tr:nth-child(1) [data-path='dates.daysAtSeaEntered']", "30");
  assert.doesNotMatch(await page.getAttribute("#recordsBody tr:nth-child(1) [data-path='dates.daysAtSeaEntered']", "class") || "", /missingField/, "red cleared when filled");
  await page.fill("#recordsBody tr:nth-child(3) [data-path='dates.daysAtSeaEntered']", "29");
  assert.deepEqual(await page.$$eval("td[data-col=convertedDays]", (tds) => tds.map((t) => t.textContent.trim())), ["30", "56", "43"], "S = R: same result");
});
await step("v0.9.0 item 7: mandatory columns follow the certificate department (deck vs engine)", async () => {
  const marked = () => page.$$eval("#serviceTable thead th.mandatory", (ths) => ths.map((t) => t.textContent.trim().charAt(0)));
  assert.deepEqual(await marked(), ["A", "B", "C", "D", "G", "H", "I", "J", "P", "Q", "S"]);
  await page.selectOption("#certificate", "ENGINEER_2_MOTOR");
  assert.deepEqual(await marked(), ["A", "B", "C", "D", "E", "I", "J", "P", "Q", "S"]);
  await page.fill("#recordsBody tr:nth-child(2) [data-path='vessel.vesselName']", "");
  await page.fill("#recordsBody tr:nth-child(2) [data-path='vessel.propulsionPowerKw']", "");
  await page.click("#btnExport");
  assert.match(await page.textContent("#statusPanel"), /Line 2: mandatory field\(s\) missing — B, E/);
  await page.fill("#recordsBody tr:nth-child(2) [data-path='vessel.vesselName']", "MV Northern Star");
  await page.fill("#recordsBody tr:nth-child(2) [data-path='vessel.propulsionPowerKw']", "8000");
  await page.selectOption("#certificate", "MASTER_500_NC");
});
await step("v0.9.0 item 3: ice days above days on board highlighted on the line and blocking export", async () => {
  const r2 = "#recordsBody tr:nth-child(2)";
  await page.fill(`${r2} [data-path='specializedService.iceConditions.ACCEPTABLE_ICE.days']`, "45");
  assert.match(await page.getAttribute(`${r2} .iceOption[data-ice=ACCEPTABLE_ICE]`, "class"), /iceExceed/);
  assert.equal(await page.textContent(`${r2} .iceOption[data-ice=ACCEPTABLE_ICE] .iceMsg`), "More than days on board (39)");
  assert.match(await page.getAttribute(`${r2} [data-col=daysOnBoard]`, "class"), /iceExceedR/);
  await page.click("#btnExport");
  const codes = await page.$$eval("#statusPanel li", (ls) => ls.map((l) => l.dataset.code));
  assert.deepEqual(codes, ["ICE_DAYS_EXCEED_ONBOARD"]);
  await page.selectOption("#langSelector", "fr");
  assert.equal(await page.textContent(`${r2} .iceOption[data-ice=ACCEPTABLE_ICE] .iceMsg`), "Plus que les jours à bord (39)");
  await page.selectOption("#langSelector", "en");
  await page.fill(`${r2} [data-path='specializedService.iceConditions.ACCEPTABLE_ICE.days']`, "20");
  assert.doesNotMatch(await page.getAttribute(`${r2} .iceOption[data-ice=ACCEPTABLE_ICE]`, "class"), /iceExceed/);
  assert.equal(await page.locator(`${r2} .iceMsg`).count(), 0);
});
let exportedCandidateFile = null;
await step("v0.9.0 item 9: Export JSON named CDN - SURNAME - UNVETTED QUALIFYING SEA SERVICE - acronym - total and dates", async () => {
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#btnExport")]);
  assert.equal(download.suggestedFilename(), "123456789 - TREMBLAY - UNVETTED QUALIFYING SEA SERVICE - M500NC - TOTAL OF 129 DAYS FROM 2025-01-01 TO 2025-06-30.json");
  exportedCandidateFile = join(tmpdir(), `sea-service-smoke-${process.pid}.json`);
  await download.saveAs(exportedCandidateFile);
  const json = JSON.parse(await readFile(exportedCandidateFile, "utf8"));
  assert.equal(json.schemaVersion, "0.5.0");
  assert.ok(json.recordId);
  assert.equal(json.voyages[0].dates.daysAtSeaEntered, 30);
});
await step("production Import JSON re-opens a file (pre-0.4 file converted)", async () => {
  await page.setInputFiles("#fileImport", preFixture);
  await page.waitForFunction(() => window.__candidateDev.getRecord()?.candidate.surname === "Smith");
  assert.match(await page.textContent("#statusPanel"), /imported/i);
});
await step("production loads a record saved by the v0.6.0 development candidate form", async () => {
  const dev06 = { schemaVersion: "0.5.0", applicationVersion: "0.6.0-dev.1", recordId: "SSR-dev06", candidate: { surname: "Dev", givenNames: "Six" },
    voyages: [{ service: { capacityCode: "MATE", watchHours: 12 }, dates: { embarkationDate: "2025-01-01", disembarkationDate: "2025-01-31" }, specializedService: { iceService: "ACCEPTABLE_ICE" } }] };
  await page.evaluate(([k, r]) => localStorage.setItem(k, JSON.stringify(r)), [CANDIDATE_KEY, dev06]);
  await page.reload();
  await page.waitForFunction(() => window.__candidateDev.getRecord()?.recordId === "SSR-dev06");
  assert.equal(await page.textContent("#recordsBody tr:nth-child(1) [data-col=convertedDays]"), "45");
  assert.equal(await page.isChecked("#recordsBody tr:nth-child(1) [data-path='specializedService.iceConditions.ACCEPTABLE_ICE.selected']"), true);
});
await step("production Export PDF / Print: blocked when requirements are missing; read-only copy with unvetted label otherwise", async () => {
  await page.evaluate(() => { window.__printCalls = 0; window.print = () => { window.__printCalls += 1; }; });
  assert.equal(await page.isChecked("#applicantDeclaration"), false, "v0.6 record without declaration");
  await page.click("#btnPrint");
  assert.equal(await page.evaluate(() => window.__printCalls), 0, "print window not opened");
  assert.match(await page.textContent("#statusPanel"), /Export blocked/);
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  assert.match(await page.textContent("#printView"), /Export blocked/, "Ctrl+P prints only the caution");
  await page.setInputFiles("#fileImport", exportedCandidateFile);
  await page.waitForFunction(() => window.__candidateDev.getRecord()?.candidate.surname === "Tremblay");
  await page.evaluate(() => { window.__printCalls = 0; window.print = () => { window.__printCalls += 1; }; });
  await page.click("#btnPrint");
  assert.equal(await page.evaluate(() => window.__printCalls), 1);
  assert.equal(await page.evaluate(() => document.title), "123456789 - TREMBLAY - UNVETTED QUALIFYING SEA SERVICE - M500NC - TOTAL OF 129 DAYS FROM 2025-01-01 TO 2025-06-30", "suggested PDF file name");
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.isVisible("#printView"), true);
  assert.equal(await page.isVisible("#serviceTable"), false);
  const txt = await page.textContent("#printView");
  assert.match(txt, /Unvetted sea service — subject to examiner review/);
  assert.match(txt, /Acceptable ice service: 20 d/);
  assert.match(txt, /Mate in Charge of a Watch/);
  assert.match(txt, /Near Coastal, Class 1/);
  await page.emulateMedia({ media: "screen" });
  assert.equal(await page.isVisible("#printView"), false);
  await page.evaluate(([k, r]) => localStorage.setItem(k, JSON.stringify(r)), [CANDIDATE_KEY, { schemaVersion: "0.5.0", recordId: "SSR-dev06", candidate: { surname: "Dev" }, voyages: [{ service: { capacityCode: "MATE", watchHours: 12 }, dates: { embarkationDate: "2025-01-01", disembarkationDate: "2025-01-31" } }] }]);
});
await step("production: no uncaught script errors", async () => { assert.deepEqual(pageErrors, []); });

// ---------- Development examiner page ----------
await step("dev/examiner.html loads without script errors or 404s", async () => {
  pageErrors.length = 0; notFound.length = 0;
  await page.goto(`${base}/dev/examiner.html`);
  await page.waitForFunction(() => window.__examinerDev);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(notFound, []);
});
await step("end-to-end: examiner loads the record saved by production index.html (same converted days)", async () => {
  await page.click("#btnLoadCandidate");
  await page.waitForSelector("tr.voyageRow");
  const rec = await page.evaluate(() => window.__examinerDev.getRecord());
  assert.equal(rec.schemaVersion, "0.5.0");
  assert.equal(rec.recordId, "SSR-dev06");
  assert.equal(rec.voyages[0].calculation.convertedDays, 45);
  assert.equal(await page.textContent("td[data-col=convertedDays]"), "45");
});

await step("examiner: 'Schema / record' not displayed; schemaVersion and recordId kept in the saved JSON", async () => {
  assert.equal(await page.locator("#infoSchema").count(), 0);
  const info = await page.textContent(".infoGrid");
  assert.ok(!/Schema \/ record|Version \/ dossier/.test(info));
  await page.click("#btnSave");
  const json = JSON.parse(await page.evaluate(() => localStorage.getItem("SeaServiceRecord.v0.5.0")));
  assert.equal(json.schemaVersion, "0.5.0");
  assert.equal(json.recordId, "SSR-dev06");
});

await step("v0.9.0 item 10: examiner export blocked until name, status and the 5 verification boxes are complete", async () => {
  let downloaded = false;
  const onDl = () => { downloaded = true; };
  page.on("download", onDl);
  await page.click("#btnExport");
  await page.waitForTimeout(400);
  page.off("download", onDl);
  assert.equal(downloaded, false);
  const codes = await page.$$eval("#statusPanel li", (ls) => ls.map((l) => l.dataset.code));
  assert.deepEqual(codes, ["EXAMINER_NAME_REQUIRED", "lineStatusRequired", "lineVerificationRequired"]);
  assert.match(await page.getAttribute("#examinerName", "class"), /missingField/);
  assert.equal(await page.locator(".reviewRow[data-index='0'] .verifyGrid label.missingCheck").count(), 5);
  await page.evaluate(() => { window.__printCalls = 0; window.print = () => { window.__printCalls += 1; }; });
  await page.click("#btnPrint");
  assert.equal(await page.evaluate(() => window.__printCalls), 0, "PDF blocked too");
});

await step("v0.9.0 item 11: review date shows today automatically (read-only)", async () => {
  const today = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
  assert.equal(await page.inputValue("#reviewDate"), today);
  assert.equal(await page.getAttribute("#reviewDate", "readonly"), "");
});

await step("load legacy 0.4.0 fixture from browser storage", async () => {
  await page.evaluate((f) => { localStorage.setItem("SeaServiceRecord", JSON.stringify(f)); localStorage.removeItem("SeaServiceRecord.v0.5.0"); localStorage.removeItem("SeaServiceRecord.v0.5.0.candidate"); }, fixture);
  await page.click("#btnLoadCandidate");
  await page.waitForFunction(() => document.querySelectorAll("tr.voyageRow").length === 3);
  const status = await page.textContent("#statusPanel");
  assert.match(status, /0\.4\.0/);
});

await step("Converted days column follows 'Days at sea' and shows TP 2293 values", async () => {
  const headers = await page.$$eval("#serviceTable thead th", (ths) => ths.map((t) => t.textContent.replace(/\s+/g, " ").trim()));
  const s = headers.findIndex((h) => /Days at sea$/.test(h));
  assert.ok(s > 0);
  assert.match(headers[s + 1], /Converted days/);
  const cells = await page.$$eval("td[data-col=convertedDays]", (tds) => tds.map((t) => t.textContent.trim()));
  assert.deepEqual(cells, ["30", "56", "43"]);
  const expl = await page.textContent(".reviewRow[data-index='1'] .calcText");
  assert.match(expl, /2\.25/);
  const atSea = await page.$$eval("td[data-col=daysAtSea]", (tds) => tds.map((t) => t.textContent.trim()));
  assert.deepEqual(atSea, ["—", "25", "—"], "older record: S blank where it equalled R");
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

await step("v0.8.0 items 3–4: no examiner basis; 'Not reviewed' not selectable; final days disabled until a status allows them", async () => {
  assert.equal(await page.locator(".reviewRow [data-field=examinerBasis]").count(), 0, "basis field removed");
  for (const f of ["reviewStatus", "finalAcceptedDays", "adjustmentReason", "examinerComments"]) {
    assert.equal(await page.locator(`.reviewRow [data-field=${f}]`).count(), 3, f);
  }
  const opts = await page.$$eval("#reviewStatus-0 option", (os) => os.filter((o) => !o.disabled && !o.hidden).map((o) => o.textContent.trim()));
  assert.deepEqual(opts, ["Accepted", "Accepted with adjustment", "Additional information required", "Rejected"]);
  assert.equal(await page.$eval("#reviewStatus-0", (s) => s.options[s.selectedIndex].textContent.trim()), "Select a status");
  for (const i of [0, 1, 2]) assert.equal(await page.isDisabled(`#finalAcceptedDays-${i}`), true);
  assert.match(await page.textContent(".reviewRow[data-index='0'] .basisDaysBox"), /Converted days \(reference\)\s*30/);
});

await step("v0.8.0 item 3: Accepted counts the converted days; final days stay disabled", async () => {
  await page.selectOption("#reviewStatus-0", "ACCEPTED");
  assert.equal(await page.isDisabled("#finalAcceptedDays-0"), true);
  assert.equal(await page.getAttribute("#finalAcceptedDays-0", "placeholder"), "30");
  assert.equal(await page.textContent(".reviewRow[data-index='0'] .countedDays"), "30");
  await page.check("#capacityVerified-0");
  await page.check("#specializedServiceVerified-0");
  assert.equal(await page.$$eval(".reviewRow[data-index='0'] .messages li.error", (ls) => ls.length), 0);
});

await step("adjustment reason: neutral '(required)' when needed, red only while empty (bug 3)", async () => {
  const label = ".reviewRow[data-index='1'] .adjustmentLabel";
  assert.equal(await page.isVisible(`${label} .reqTag`), false, "no indicator before a reason is needed");
  await page.selectOption("#reviewStatus-1", "ACCEPTED_WITH_ADJUSTMENT");
  assert.equal(await page.isDisabled("#finalAcceptedDays-1"), false, "enabled for Accepted with adjustment");
  await page.fill("#finalAcceptedDays-1", "20");
  let cls = await page.getAttribute(label, "class");
  assert.match(cls, /\bneeded\b/); assert.match(cls, /\bmissing\b/);
  assert.equal((await page.textContent(`${label} .reqTag`)).trim(), "(required)");
  const codes = await page.$$eval(".reviewRow[data-index='1'] .messages li.warning.reasonMissing", (ls) => ls.map((l) => l.dataset.code));
  assert.deepEqual(codes, ["ADJUSTMENT_REASON_REQUIRED"], "shown clearly as a warning");
  assert.equal(await page.$$eval(".reviewRow[data-index='1'] .messages li.error", (ls) => ls.length), 0, "not an error");
  assert.equal(await page.$eval("#adjustmentReason-1", (e) => getComputedStyle(e).borderTopColor), "rgb(176, 0, 32)");
  await page.type("#adjustmentReason-1", "F");
  cls = await page.getAttribute(label, "class");
  assert.doesNotMatch(cls, /\bmissing\b/, "red cleared as soon as text is entered");
  assert.notEqual(await page.$eval("#adjustmentReason-1", (e) => getComputedStyle(e).borderTopColor), "rgb(176, 0, 32)");
  await page.fill("#adjustmentReason-1", "Five days alongside for repairs.");
  assert.equal(await page.isVisible(`${label} .reqTag`), true, "neutral indicator stays");
  assert.equal(await page.textContent(".reviewRow[data-index='1'] .countedDays"), "20", "final days override converted days");
});

await step("v0.8.0 item 3: Additional information required enables final days; Rejected disables and counts 0", async () => {
  await page.selectOption("#reviewStatus-2", "ADDITIONAL_INFORMATION_REQUIRED");
  assert.equal(await page.isDisabled("#finalAcceptedDays-2"), false);
  assert.equal(await page.textContent(".reviewRow[data-index='2'] .countedDays"), "0");
  await page.fill("#finalAcceptedDays-2", "43");
  assert.equal(await page.textContent(".reviewRow[data-index='2'] .countedDays"), "43");
  assert.doesNotMatch(await page.getAttribute(".reviewRow[data-index='2'] .adjustmentLabel", "class"), /\bneeded\b/);
  await page.selectOption("#reviewStatus-2", "REJECTED");
  assert.equal(await page.isDisabled("#finalAcceptedDays-2"), true);
  assert.equal(await page.inputValue("#finalAcceptedDays-2"), "");
  assert.equal(await page.textContent(".reviewRow[data-index='2'] .countedDays"), "0");
  await page.selectOption("#reviewStatus-2", "ADDITIONAL_INFORMATION_REQUIRED");
  await page.fill("#finalAcceptedDays-2", "40");
  assert.match(await page.getAttribute(".reviewRow[data-index='2'] .adjustmentLabel", "class"), /\bmissing\b/);
  await page.fill("#adjustmentReason-2", "Awaiting master's testimonial.");
});

await step("v0.8.0 items 5–6: summary — bold total with certificate, reduced list, special-service totals", async () => {
  assert.equal(await page.textContent("#sumDaysOnBoard"), "98");
  assert.equal(await page.textContent("#sumConvertedDays"), "129");
  assert.equal(await page.textContent("#sumFinalAcceptedDays"), "90");
  assert.equal(await page.textContent("#sumFinalAcceptedMonths"), "(3 months)");
  assert.ok(Number(await page.$eval("#sumFinalAcceptedDays", (e) => getComputedStyle(e).fontWeight)) >= 700, "bold");
  assert.equal(await page.textContent("#sumCertificate"), "Master 500 Gross Tonnage, Near Coastal");
  assert.ok(Number(await page.$eval("#sumCertificate", (e) => getComputedStyle(e).fontWeight)) >= 700, "bold");
  assert.equal(await page.textContent("#sumDifference"), "-39");
  assert.equal(await page.textContent("#sumInfo"), "1");
  for (const id of ["sumReviewed", "sumNotReviewed", "sumAccepted", "sumAdjusted", "sumRejected", "sumErrors", "sumFinalLines", "sumMissingReason"]) {
    assert.equal(await page.locator(`#${id}`).count(), 0, `${id} removed`);
  }
  const card = await page.$$eval(".summaryCard:has(#sumFinalAcceptedDays) > div", (ds) => ds.map((d) => d.textContent.trim()));
  assert.ok(!card.some((tx) => /^Lines\b/.test(tx)), card.join(" | "));
  const services = await page.$$eval("#sumSpecialServices li", (ls) => Object.fromEntries(ls.map((l) => [l.dataset.service, l.querySelector("strong").textContent])));
  assert.deepEqual(services, { POLAR: "0", PASSENGER: "30", OIL_TRANSFER: "20", DP: "40", OFFSHORE: "40" });
});

await step("French: labels, capacity, certificate, months, input preserved across language switch", async () => {
  await page.selectOption("#langSelector", "fr");
  const labels = await page.$$eval(".reviewRow[data-index='0'] .verifyGrid label", (ls) => ls.map((l) => l.textContent.trim()));
  assert.ok(labels.includes("Fonction vérifiée"));
  assert.equal((await page.textContent("dt[data-i18n=givenNames]")).trim(), "Prénom");
  assert.equal((await page.textContent("tr.voyageRow[data-index='0'] td:nth-child(2)")).trim(), "Officier de pont en charge du quart à la passerelle");
  assert.equal(await page.textContent("#sumCertificate"), "Capitaine, jauge brute de 500, à proximité du littoral");
  assert.equal(await page.textContent("#sumFinalAcceptedMonths"), "(3 mois)");
  assert.match(await page.textContent(".reviewRow[data-index='1'] .calcText"), /jours crédités/);
  assert.equal(await page.inputValue("#adjustmentReason-1"), "Five days alongside for repairs.");
  assert.equal(await page.inputValue("#finalAcceptedDays-1"), "20");
  assert.equal((await page.textContent(".reviewRow[data-index='1'] .reqTag")).trim(), "(obligatoire)");
  assert.match(await page.textContent(".specialServices h4"), /Service spécialisé approuvé/);
  await page.selectOption("#langSelector", "en");
  assert.equal((await page.textContent("tr.voyageRow[data-index='0'] td:nth-child(2)")).trim(), "Mate in Charge of a Watch");
});

await step("save stores 0.5.0 draft separately; candidate record untouched", async () => {
  const before = await page.evaluate(() => localStorage.getItem("SeaServiceRecord"));
  await page.click("#btnSave");
  const draft = JSON.parse(await page.evaluate(() => localStorage.getItem("SeaServiceRecord.v0.5.0")));
  assert.equal(await page.evaluate(() => localStorage.getItem("SeaServiceRecord")), before);
  assert.equal(draft.schemaVersion, "0.5.0");
  assert.equal(draft.applicationVersion, "0.9.0");
  assert.deepEqual(draft.voyages.map((v) => v.examinerReview.reviewStatus), ["ACCEPTED", "ACCEPTED_WITH_ADJUSTMENT", "ADDITIONAL_INFORMATION_REQUIRED"]);
  assert.deepEqual(draft.voyages.map((v) => v.examinerReview.finalAcceptedDays), [null, 20, 40]);
  assert.deepEqual(draft.voyages.map((v) => v.examinerReview.effectiveAcceptedDays), [30, 20, 40]);
  assert.equal(draft.examinerAssessment.totalFinalAcceptedDays, 90);
  assert.deepEqual(draft.calculationSummary.examinerDetermination.specialServiceApprovedDays, { POLAR: 0, PASSENGER: 30, OIL_TRANSFER: 20, DP: 40, OFFSHORE: 40 });
});

await step("reload restores the examiner draft", async () => {
  await page.reload();
  await page.click("#btnLoadDraft");
  await page.waitForSelector("tr.voyageRow");
  assert.equal(await page.inputValue("#finalAcceptedDays-1"), "20");
  assert.equal(await page.isDisabled("#finalAcceptedDays-0"), true);
  assert.equal(await page.isChecked("#capacityVerified-0"), true);
  assert.equal(await page.textContent("#sumFinalAcceptedDays"), "90");
});

await step("v0.9.0 item 1: vet ice and transfer-operation days per line (over-limit = error that blocks save)", async () => {
  // line 2 (index 1): Accepted with adjustment, 20 days counted; Polar waters (no days entered → automatic 0) and oil transfer (automatic 20)
  const rows = await page.$$eval(".reviewRow[data-index='1'] .svcTable tr[data-service]", (trs) => trs.map((tr) => [tr.dataset.service, tr.querySelector(".svcAuto").textContent]));
  assert.deepEqual(rows, [["POLAR", "0"], ["OIL_TRANSFER", "20"]]);
  assert.equal(await page.locator(".reviewRow[data-index='0'] .svcTable").count(), 0, "line 1 has no ice / transfer service");
  await page.fill("#svc-POLAR-final-1", "25");
  const errs = await page.$$eval(".reviewRow[data-index='1'] .messages li.error", (ls) => ls.map((l) => l.dataset.code));
  assert.ok(errs.includes("SERVICE_DAYS_EXCEED_LINE"));
  assert.match(await page.getAttribute("#svc-POLAR-final-1", "class"), /svcOverLimit/);
  const before = await page.evaluate(() => localStorage.getItem("SeaServiceRecord.v0.5.0"));
  await page.click("#btnSave");
  assert.match(await page.textContent("#statusPanel"), /Not saved/);
  assert.equal(await page.evaluate(() => localStorage.getItem("SeaServiceRecord.v0.5.0")), before, "draft not overwritten");
  await page.fill("#svc-POLAR-final-1", "15");
  assert.doesNotMatch(await page.getAttribute("#svc-POLAR-final-1", "class"), /svcOverLimit/);
  assert.match(await page.getAttribute("#svc-POLAR-reason-1", "class"), /svcReasonMissing/);
  await page.fill("#svc-POLAR-reason-1", "Ice log: 15 days in polar waters.");
  await page.fill("#svc-OIL_TRANSFER-final-1", "18");
  await page.fill("#svc-OIL_TRANSFER-reason-1", "Two days without transfer.");
  const warns = await page.$$eval(".reviewRow[data-index='1'] .messages li", (ls) => ls.map((l) => l.dataset.code));
  assert.ok(!warns.includes("SERVICE_REASON_REQUIRED") && !warns.includes("SERVICE_DAYS_EXCEED_LINE"));
});

await step("v0.9.0 item 2: examiner determination shows final service figures with the automatic one when adjusted", async () => {
  const items = await page.$$eval("#sumSpecialServices li", (ls) => Object.fromEntries(ls.map((l) => [l.dataset.service, l.textContent.replace(/\s+/g, " ").trim()])));
  assert.equal(items.POLAR, "Polar waters: 15 (adjusted — automatic 0)");
  assert.equal(items.OIL_TRANSFER, "Oil transfer: 18 (adjusted — automatic 20)");
  assert.equal(items.PASSENGER, "Passenger service: 30");
  await page.selectOption("#langSelector", "fr");
  const fr = await page.$$eval("#sumSpecialServices li", (ls) => ls.map((l) => l.textContent.replace(/\s+/g, " ").trim()));
  assert.ok(fr.includes("Eaux polaires: 15 (rajusté — automatique 0)"), fr.join(" | "));
  assert.equal(await page.inputValue("#svc-POLAR-reason-1"), "Ice log: 15 days in polar waters.", "kept across language switch");
  await page.selectOption("#langSelector", "en");
});

await step("v0.9.0 items 9–10: complete the mandatory examiner fields → VETTED JSON with both service figures", async () => {
  await page.fill("#examinerName", "A. Examiner");
  for (const i of [0, 1, 2]) for (const f of ["vesselVerified", "capacityVerified", "datesVerified", "specializedServiceVerified", "supportingDocumentsVerified"]) await page.check(`#${f}-${i}`);
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#btnExport")]);
  assert.equal(download.suggestedFilename(), "123456789 - TREMBLAY - VETTED QUALIFYING SEA SERVICE - M500NC - TOTAL OF 90 DAYS FROM 2025-01-01 TO 2025-06-30.json");
  const json = JSON.parse(await readFile(await download.path(), "utf8"));
  const sr = json.voyages[1].examinerReview.serviceReview;
  assert.equal(sr.POLAR.automaticDays, 0); assert.equal(sr.POLAR.finalAcceptedDays, 15); assert.equal(sr.POLAR.effectiveDays, 15);
  assert.equal(sr.OIL_TRANSFER.automaticDays, 20); assert.equal(sr.OIL_TRANSFER.finalAcceptedDays, 18);
  const ed = json.calculationSummary.examinerDetermination;
  assert.equal(ed.specialServiceApprovedDays.OIL_TRANSFER, 18);
  assert.equal(ed.specialServiceAutomaticDays.OIL_TRANSFER, 20);
  assert.equal(ed.specialServiceAdjusted.OIL_TRANSFER, true);
  assert.equal(json.examinerAssessment.examiner.examinerName, "A. Examiner");
  assert.match(json.examinerAssessment.reviewDate, /^\d{4}-\d{2}-\d{2}$/);
  await page.click("#btnSave");
});

await step("examiner Export PDF / Print copy: bold total with certificate, special services", async () => {
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  const html = await page.innerHTML("#printView");
  assert.match(html, /<strong>Total final accepted days: 90 \(3 months\)<\/strong>/);
  assert.match(html, /Certificate applied for: <strong>Master 500 Gross Tonnage, Near Coastal<\/strong>/);
  assert.match(html, /Oil transfer<\/th><td>18 \(adjusted — automatic 20\)/);
  assert.match(html, /Polar waters: 0 → <strong>15<\/strong> \(Ice log: 15 days in polar waters\.\)/);
  assert.ok(!html.includes("Unvetted"));
});

await step("examiner draft saved by v0.7.0 (Accepted with final days ≠ converted) loads as 'Accepted with adjustment'", async () => {
  const draft = JSON.parse(await page.evaluate(() => localStorage.getItem("SeaServiceRecord.v0.5.0")));
  Object.assign(draft.voyages[0].examinerReview, { reviewStatus: "ACCEPTED", examinerBasis: "DAYS_ON_BOARD", finalAcceptedDays: 28 });
  draft.applicationVersion = "0.7.0";
  await page.evaluate((d) => localStorage.setItem("SeaServiceRecord.v0.5.0", JSON.stringify(d)), draft);
  await page.click("#btnLoadDraft");
  await page.waitForFunction(() => window.__examinerDev.getRecord()?.voyages[0].examinerReview.reviewStatus === "ACCEPTED_WITH_ADJUSTMENT");
  assert.equal(await page.inputValue("#reviewStatus-0"), "ACCEPTED_WITH_ADJUSTMENT");
  assert.equal(await page.inputValue("#finalAcceptedDays-0"), "28");
  const w = await page.$$eval(".reviewRow[data-index='0'] .messages li", (ls) => ls.map((l) => l.dataset.code));
  assert.ok(w.includes("REVIEW_STATUS_CONVERTED_V080"));
  assert.equal(await page.textContent("#sumFinalAcceptedDays"), "88");
});

await step("import pre-0.4 JSON: legacy positionVerified/seaServiceVerified/polar/ice/DP/offshore/tanker", async () => {
  await page.setInputFiles("#fileImport", preFixture);
  await page.waitForFunction(() => window.__examinerDev.getRecord()?.candidate.surname === "Smith");
  assert.equal(await page.isChecked("#capacityVerified-0"), true);
  assert.equal(await page.isChecked("#specializedServiceVerified-0"), true);
  const spec = (await page.textContent("tr.voyageRow[data-index='0'] td.specialized")).replace(/\s+/g, " ");
  assert.match(spec, /Polar waters: \?/);
  assert.match(spec, /Acceptable ice service: \?/);
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
  const today = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
  assert.equal(await page.inputValue("#applicationDate"), today, "v0.9.0 item 11: application date defaults to today");
  await page.fill("#applicationDate", "2026-01-15");
  await page.dispatchEvent("#applicationDate", "change");
  assert.equal(await page.evaluate(() => window.__candidateDev.getRecord().application.applicationDate), "2026-01-15", "still editable");
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
if (exportedCandidateFile) await unlink(exportedCandidateFile).catch(() => {});
await browser.close();
server.close();

for (const [s, n, m] of results) console.log(`${s}  ${n}${m ? "  — " + m : ""}`);
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} smoke tests passed.`);
process.exitCode = failed ? 1 : 0;
