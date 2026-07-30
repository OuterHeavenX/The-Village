import { chromium } from 'playwright-core';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userId = '11111111-1111-4111-8111-111111111111';
const nowSeconds = Math.floor(Date.now() / 1000);
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
  aud: 'authenticated',
  exp: nowSeconds + 3600,
  iat: nowSeconds,
  sub: userId,
  email: 'vite-smoke@the-village.test',
  role: 'authenticated'
})}.test-signature`;
const session = {
  access_token: accessToken,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: nowSeconds + 3600,
  refresh_token: 'vite-smoke-refresh',
  user: {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'vite-smoke@the-village.test',
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { display_name: 'Vite Smoke Tester' },
    identities: [],
    created_at: new Date().toISOString()
  }
};

async function mockSupabase(context) {
  await context.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, {
    key: 'sb-ulsixgjgppiqouqdppvv-auth-token',
    value: session
  });

  await context.route('https://ulsixgjgppiqouqdppvv.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const updatedAt = new Date().toISOString();
    if (url.pathname.includes('/auth/v1/token')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) });
    }
    if (url.pathname.includes('/auth/v1/user')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session.user) });
    }
    if (url.pathname.includes('/rest/v1/profiles')) {
      const profile = {
        id: userId,
        display_name: 'Vite Smoke Tester',
        total_play_time_seconds: 0,
        last_login_at: updatedAt,
        last_seen_at: updatedAt,
        game_version: '35.1.1',
        updated_at: updatedAt
      };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(request.method() === 'GET' ? [profile] : profile)
      });
    }
    if (url.pathname.includes('/rest/v1/player_saves')) {
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ revision: 1, updated_at: updatedAt })
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function runViewport(browser, viewport, mobile = false) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    hasTouch: mobile,
    isMobile: mobile
  });
  await mockSupabase(context);
  const page = await context.newPage();
  const errors = [];
  const failedAssets = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && response.url().startsWith(baseUrl)) {
      failedAssets.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('html.auth-ready', { timeout: 20000 });
  await page.waitForSelector('#villageThreeCanvas', { timeout: 20000 });
  await page.waitForFunction(() => window.ROTKGameBridge && window.VillageBattleAPI);
  await page.waitForFunction(() => document.querySelector('#accountCloudStatus')?.textContent === 'Synced');
  if (!mobile) {
    await page.waitForTimeout(16000);
    const idleStatus = await page.locator('#accountCloudStatus').textContent();
    if (idleStatus !== 'Synced') errors.push(`Idle Village polling changed cloud status to: ${idleStatus}`);
  }
  const idleSync = await page.evaluate(() => {
    const before = document.querySelector('#accountCloudStatus')?.textContent;
    const lastTick = JSON.parse(localStorage.getItem('relicsEclipseSave') || '{}')?.villageEconomy?.lastTick;
    for (let poll = 0; poll < 4; poll++) window.ROTKGameBridge.getVillageEconomy();
    const after = document.querySelector('#accountCloudStatus')?.textContent;
    const nextTick = JSON.parse(localStorage.getItem('relicsEclipseSave') || '{}')?.villageEconomy?.lastTick;
    return { before, after, lastTick, nextTick };
  });
  if (idleSync.before !== 'Synced' || idleSync.after !== 'Synced') {
    errors.push(`Idle Village polling changed cloud status: ${idleSync.before} -> ${idleSync.after}`);
  }
  if (idleSync.lastTick !== idleSync.nextTick) {
    errors.push('Idle Village polling mutated the persisted economy timestamp');
  }

  const release = await page.locator('[data-release-label]').textContent();
  if (!release?.includes('35.1.1')) errors.push(`Visible release label is incorrect: ${release}`);

  if (mobile) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 2) errors.push(`Mobile layout overflows horizontally by ${overflow}px`);
  } else {
    const prologueSkip = page.locator('#prologueSkip');
    if (await prologueSkip.isVisible()) {
      await prologueSkip.click();
      await page.waitForSelector('#prologueOverlay', { state: 'hidden' });
    }
    const roadmapClose = page.locator('#roadmapClose');
    if (await roadmapClose.isVisible()) {
      await roadmapClose.click();
      await page.waitForSelector('#roadmapOverlay', { state: 'hidden' });
    }
    await page.evaluate(() => document.querySelector('#bottomNav [data-nav="campaign"]')?.click());
    await page.waitForSelector('#campaignScreen:not(.hidden)');
    await page.locator('#chapterMap .chapter-node button:not([disabled])').first().click();
    await page.waitForFunction(() => document.body.classList.contains('battle-mode'));
    await page.waitForTimeout(3500);
    await page.evaluate(() => window.VillageBattleAPI.menu());
    await page.waitForFunction(() => !document.body.classList.contains('battle-mode'));

    await page.click('#bottomNav [data-nav="cards"]');
    await page.waitForSelector('#deckScreen:not(.hidden)');
    for (const filter of ['equipment', 'gems', 'heroProfile']) {
      await page.click(`.card-file-tab[data-card-filter="${filter}"]`);
      await page.waitForTimeout(100);
    }
    await page.click('#bottomNav [data-nav="heroes"]');
    await page.waitForSelector('#heroesScreen:not(.hidden)');
  }

  await page.waitForTimeout(1500);
  await context.close();
  if (failedAssets.length) errors.push(...failedAssets);
  return errors;
}

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-webgl', '--autoplay-policy=no-user-gesture-required']
});
try {
  const desktopErrors = await runViewport(browser, { width: 1440, height: 900 });
  const mobileErrors = await runViewport(browser, { width: 390, height: 844 }, true);
  const errors = [...desktopErrors, ...mobileErrors];
  if (errors.length) {
    console.error(`Production smoke test failed:\n${errors.map(error => `- ${error}`).join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log('Production smoke test passed: auth/cloud bootstrap, Village 3D, battle, Ascension views, companions, desktop, and mobile loaded without runtime errors or asset 404s.');
  }
} finally {
  await browser.close();
}
