#!/usr/bin/env node
"use strict";

// Uses real Hugo output and Pagefind indexes, not a mocked search response.
// Optional executable/module overrides: LUMEN_HUGO, LUMEN_PAGEFIND,
// LUMEN_PLAYWRIGHT, and LUMEN_BROWSER. The repository is never built in place.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const theme = path.resolve(__dirname, "..");
const base = "https://example.org/review/";
const resultLinks = ".site-search-result h2 a";

function command(executable, args) {
  const result = spawnSync(executable, args, { encoding: "utf8" });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${executable} failed:\n${result.stdout}\n${result.stderr}`);
}

function playwright() {
  if (process.env.LUMEN_PLAYWRIGHT) return require(process.env.LUMEN_PLAYWRIGHT);
  try { return require("playwright"); }
  catch (_) { return require("playwright-core"); }
}

function prepare(site) {
  fs.cpSync(path.join(theme, "exampleSite"), site, { recursive: true });
  fs.cpSync(path.join(theme, "tests/search/content"), path.join(site, "content"), { recursive: true });
  fs.mkdirSync(path.join(site, "themes"), { recursive: true });
  fs.symlinkSync(theme, path.join(site, "themes/lumen"), "junction");
  fs.appendFileSync(path.join(site, "hugo.yaml"), "\npagination:\n  pagerSize: 2\n  path: page\n");

  // A stable corpus makes result counts independent of example article edits.
  for (let index = 1; index <= 12; index += 1) {
    for (const suffix of ["", ".ja"]) {
      fs.writeFileSync(path.join(site, `content/search-batch-${index}${suffix}.md`),
        `---\ntitle: Batch ${index}\ndraft: false\n---\n\npagefindbatchmarker\n`);
    }
  }
  const news = path.join(site, "content/news");
  fs.rmSync(news, { recursive: true, force: true });
  fs.mkdirSync(news);
  for (const suffix of ["", ".ja"]) {
    fs.writeFileSync(path.join(news, `_index${suffix}.md`), "---\ntitle: Updates\nlayout: paginated\n---\n");
    for (let index = 1; index <= 4; index += 1) {
      fs.writeFileSync(path.join(news, `update-${index}${suffix}.md`),
        `---\ntitle: Update ${index}\ndate: 2020-01-0${index}\ndraft: false\n---\n\nＮＥＷＳＷＩＤＴＨＭＡＲＫＥＲ\n`);
    }
  }
}

async function finished(page) {
  await page.waitForFunction(() => ["results", "empty", "error"].includes(document.querySelector("#site-search").dataset.state));
  assert.equal(await page.locator("#site-search").getAttribute("data-state"), "results",
    await page.locator("#site-search-status").textContent());
}

async function expectWidthResult(page, language, query) {
  await finished(page);
  assert.deepEqual(await page.locator(resultLinks).evaluateAll(links => links.map(link => link.pathname)),
    [`/review/${language}query-width/`], `The literal body text ${JSON.stringify(query)} must be searchable`);
  assert.equal(new URL(page.url()).searchParams.get("q"), query);
  assert.equal(await page.locator("#site-search-input").inputValue(), query);
}

async function main() {
  const { chromium } = playwright();
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "lumen-search-"));
  const site = path.join(temporary, "site");
  const output = path.join(temporary, "public");
  let browser;
  let passed = false;
  try {
    prepare(site);
    command(process.env.LUMEN_HUGO || "hugo", ["--source", site, "--destination", output, "--baseURL", base, "--panicOnWarning"]);
    command(process.env.LUMEN_PAGEFIND || "pagefind", ["--site", output]);
    browser = await chromium.launch({
      executablePath: process.env.LUMEN_BROWSER || undefined,
      headless: true,
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    let delayFragment;
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (!url.href.startsWith(base)) return route.abort();
      let relative = decodeURIComponent(url.pathname.slice(new URL(base).pathname.length));
      if (!relative || relative.endsWith("/")) relative += "index.html";
      const filename = path.resolve(output, relative);
      if (!filename.startsWith(`${output}${path.sep}`) || !fs.existsSync(filename)) {
        return route.fulfill({ status: 404, body: "Not found" });
      }
      if (delayFragment && relative.includes("pagefind/fragment/")) {
        const delay = delayFragment;
        delayFragment = undefined;
        delay.started();
        await delay.release;
      }
      const contentType = {
        ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
        ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml",
      }[path.extname(filename)] || "application/octet-stream";
      await route.fulfill({ status: 200, body: fs.readFileSync(filename), contentType });
    });

    for (const [language, queries] of [
      ["", ["ＦＵＬＬＷＩＤＴＨＡＢＣ", "HALFWIDTHXYZ"]],
      ["ja/", ["ＡＰＩ", "HALFWIDTHXYZ", "検索品質検証"]],
    ]) {
      for (const query of queries) {
        await page.goto(`${base}${language}search/?q=${encodeURIComponent(query)}`);
        await expectWidthResult(page, language, query);
      }

      await page.goto(`${base}${language}search/?q=pagefindbatchmarker`);
      await finished(page);
      assert.equal(await page.locator(resultLinks).count(), 10);
      await page.locator("#site-search-more").click();
      await finished(page);
      assert.equal(await page.locator(resultLinks).count(), 12);
      assert.equal(await page.locator("#site-search-more").isVisible(), false);
      const hrefs = await page.locator(resultLinks).evaluateAll(links => links.map(link => link.href));
      assert.equal(new Set(hrefs).size, 12);
      assert(hrefs.every(href => href.startsWith(`${base}${language}search-batch-`)));
    }
    console.log("PASS: full-width, ASCII and Japanese literal queries; 10 + 2 result pagination (EN/JA)");

    await page.goto(`${base}ja/search/`);
    await page.waitForFunction(() => document.querySelector("#site-search").dataset.state === "idle");
    await page.locator("#site-search-input").evaluate(input => {
      input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      input.value = "ＡＰＩ";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, isComposing: true }));
    });
    // Wait beyond the 250 ms debounce to catch accidental intermediate searches.
    await page.waitForTimeout(350);
    assert.equal(await page.locator("#site-search").getAttribute("data-state"), "composing");
    assert.equal(await page.locator(resultLinks).count(), 0);
    assert.equal(new URL(page.url()).searchParams.get("q"), null);
    await page.locator("#site-search-input").dispatchEvent("compositionend");
    await expectWidthResult(page, "ja/", "ＡＰＩ");
    console.log("PASS: IME composition waits for committed full-width text");

    // Delay a real Pagefind result fragment until the replacement query finishes.
    await page.goto(`${base}search/`);
    let release;
    let started;
    const blocked = new Promise(resolve => { started = resolve; });
    delayFragment = { started, release: new Promise(resolve => { release = resolve; }) };
    try {
      await page.locator("#site-search-input").fill("pagefindbatchmarker");
      let timeout;
      try {
        await Promise.race([blocked, new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error("No Pagefind fragment request was intercepted")), 15000);
        })]);
      } finally { clearTimeout(timeout); }
      await page.locator("#site-search-input").fill("HALFWIDTHXYZ");
      await expectWidthResult(page, "", "HALFWIDTHXYZ");
    } finally { release(); delayFragment = undefined; }
    await page.waitForLoadState("networkidle");
    await expectWidthResult(page, "", "HALFWIDTHXYZ");
    console.log("PASS: late results cannot replace a newer query");

    // News deliberately normalizes both its corpus and query. Keep its existing
    // width-insensitive filter and native/filtered pagination behavior intact.
    for (const language of ["", "ja/"]) {
      await page.goto(`${base}${language}news/page/2/`);
      await page.waitForSelector("#news-filter-controls:not([hidden])");
      assert.equal(await page.locator("#news-list > li").count(), 2);
      for (const query of ["NEWSWIDTHMARKER", "ＮＥＷＳＷＩＤＴＨＭＡＲＫＥＲ"]) {
        await page.locator("#news-keyword").fill(query);
        await page.waitForFunction(q => new URL(location.href).searchParams.get("q") === q, query);
        assert.equal(await page.locator("#news-results-count strong").textContent(), "4");
        assert.equal(await page.locator("#news-list > li").count(), 2);
      }
      await page.locator('#news-filter-pagination button[data-page="2"]').first().click();
      assert.equal(new URL(page.url()).searchParams.get("page"), "2");
      assert.equal(await page.locator("#news-list > li").count(), 2);
      await page.goBack();
      await page.waitForFunction(() => new URL(location.href).searchParams.get("page") === null);
      await page.locator("#news-filters [data-news-reset]").click();
      await page.waitForURL(`${base}${language}news/`);
      await page.waitForSelector("#news-filter-controls:not([hidden])");
      assert.equal(await page.locator("#news-list > li").count(), 2);
    }
    console.log("PASS: news width matching, paging, history and reset (EN/JA)");
    assert.deepEqual(errors, [], "Browser JavaScript errors");
    passed = true;
  } finally {
    if (browser) await browser.close();
    if (passed) fs.rmSync(temporary, { recursive: true, force: true });
    else console.error(`Search test artifacts retained at ${temporary}`);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
