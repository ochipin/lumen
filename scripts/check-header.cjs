const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.LUMEN_PLAYWRIGHT || 'playwright');

const theme = path.resolve(__dirname, '..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'lumen-header-'));
const output = path.join(work, 'public');
const origin = 'https://lumen.test';
const prefix = '/review';
const japanese = 'プログラミングと個人開発のための技術ドキュメント';
const english = 'DocumentationForProgrammingAndIndependentSoftwareDevelopment';
const cases = [
  { name: 'Japanese brand', params: { brand: japanese } },
  { name: 'Unbroken English brand', params: { brand: english } },
  { name: 'Site title and logo', title: japanese, params: { logo: '/logo.svg' } },
  { name: 'Short brand with subtitle', params: { brand: 'Field Notes', brandSubtitle: 'Research and tools' } },
];
fs.cpSync(path.join(theme, 'exampleSite/content'), path.join(work, 'content'), { recursive: true });
fs.mkdirSync(path.join(work, 'static'));
fs.writeFileSync(path.join(work, 'static/logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="42"><rect width="72" height="42" fill="#245cf2"/></svg>');

async function check(browser, config, javascript) {
  const context = await browser.newContext({ javaScriptEnabled: javascript, viewport: { width: 1280, height: 900 } });
  const errors = [], missing = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || !url.pathname.startsWith(prefix + '/')) {
      missing.push(url.href); return route.abort();
    }
    let file = path.join(output, decodeURIComponent(url.pathname.slice(prefix.length)));
    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { missing.push(url.href); return route.abort(); }
    const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
    return route.fulfill({ path: file, contentType: mime[path.extname(file)] || 'application/octet-stream' });
  });
  try {
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const language of ['ja', 'en']) {
      await page.goto(origin + prefix + '/' + language + '/');
      await page.evaluate(() => document.fonts.ready);
      const brand = config.params.brand || config.title;
      assert.equal(await page.locator('.brand-name').textContent(), brand);
      assert.equal(await page.locator('.brand-name').getAttribute('title'), brand);
      assert((await page.locator('.brand').getAttribute('aria-label')).includes(brand));
      for (const width of [320, 390, 760, 1050, 1051, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const layout = await page.evaluate(() => {
          const brand = document.querySelector('.brand').getBoundingClientRect();
          const actions = document.querySelector('.header-actions').getBoundingClientRect();
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            overlap: brand.right > actions.left + 1,
            outside: actions.right > innerWidth,
            headerHeight: document.querySelector('.site-header').getBoundingClientRect().height,
            nameWidth: document.querySelector('.brand-name').getBoundingClientRect().width,
            outsideElements: [...document.querySelectorAll('body *')].filter(el => {
              const rect = el.getBoundingClientRect();
              return rect.width && rect.right > innerWidth + 1 && getComputedStyle(el).position !== 'absolute';
            }).slice(0, 5).map(el => el.className),
          };
        });
        assert.equal(layout.overflow, false, JSON.stringify({ language, width, layout }));
        assert.equal(layout.overlap, false, 'Brand overlaps header controls');
        assert.equal(layout.outside, false, 'Header controls are offscreen');
        assert(layout.nameWidth > 0, 'Brand name remains visible');
        if (javascript) assert(layout.headerHeight <= 90, 'Long name should not move controls to a second row');
      }
      await page.setViewportSize({ width: 390, height: 900 });
      if (javascript) {
        await page.locator('.menu-toggle').click();
        assert(await page.locator('.site-nav').isVisible());
        await page.locator('.nav-dropdown > summary').first().click();
        assert(await page.locator('.nav-dropdown').first().evaluate(el => el.open));
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.nav-dropdown').first().evaluate(el => el.open), false);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.site-nav').isVisible(), false);
        await page.locator('.language-switcher > summary').click();
        assert(await page.locator('.language-panel').isVisible());
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.language-switcher').evaluate(el => el.open), false);
      } else {
        assert(await page.locator('.site-nav').isVisible(), 'Navigation remains available without JavaScript');
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.LUMEN_BROWSER ? { executablePath: process.env.LUMEN_BROWSER } : {}) });
  try {
    for (const sample of cases) {
      const config = {
        baseURL: origin + prefix + '/', title: sample.title || 'Field Notes',
        theme: path.basename(theme), themesDir: path.dirname(theme),
        defaultContentLanguage: 'en', defaultContentLanguageInSubdir: true,
        languages: { en: { locale: 'en-US', label: 'English' }, ja: { locale: 'ja-JP', label: '日本語' } },
        params: sample.params,
      };
      fs.writeFileSync(path.join(work, 'hugo.json'), JSON.stringify(config));
      execFileSync(process.env.LUMEN_HUGO || 'hugo', ['--source', work, '--cacheDir', path.join(work, 'cache'), '--cleanDestinationDir', '--minify', '--panicOnWarning'], { stdio: 'pipe' });
      await check(browser, config, true);
      if (sample.name === 'Site title and logo') await check(browser, config, false);
      console.log('PASS: ' + sample.name + ' — JA/EN, 320–1440px, header controls and mobile navigation');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => fs.rmSync(work, { recursive: true, force: true }));
