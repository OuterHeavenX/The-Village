import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const battleVisualOnly = process.env.BATTLE_VISUAL_ONLY === '1';
const cardsVisualOnly = process.env.CARDS_VISUAL_ONLY === '1';
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
        game_version: '37.0.0',
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

  const pageUrl = new URL(baseUrl); if (!mobile) pageUrl.searchParams.set('visualAudit','1');
  await page.goto(pageUrl.href, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('html.auth-ready', { timeout: 20000 });
  await page.waitForSelector('#villageThreeCanvas', { timeout: 20000 });
  await page.waitForFunction(() => window.ROTKGameBridge && window.VillageBattleAPI);
  await page.waitForFunction(() => document.querySelector('#accountCloudStatus')?.textContent === 'Synced');
  const villageAuditDirectory = 'test-results/village-visual-audit';
  await mkdir(villageAuditDirectory, { recursive: true });
  const viewportName=mobile?(viewport.width<600?'iphone':'ipad'):'desktop';
  await page.waitForTimeout(1200);
  const villageVisualState=await page.evaluate(()=>({
    canvas:!!document.querySelector('#villageThreeCanvas'),
    classicCitizensVisible:[...document.querySelectorAll('.village-citizen-layer')].some(el=>getComputedStyle(el).display!=='none'),
    horizontalOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
  }));
  if(!villageVisualState.canvas)errors.push('Village 2.0 canvas is missing.');
  if(villageVisualState.classicCitizensVisible)errors.push('Legacy DOM citizens remain visible over Village 2.0.');
  if(villageVisualState.horizontalOverflow>2)errors.push(`Village ${viewportName} overflows horizontally by ${villageVisualState.horizontalOverflow}px`);
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
  if (!release?.includes('37.0.0')) errors.push(`Visible release label is incorrect: ${release}`);

  const onboardingSkip = page.locator('#prologueSkip');
  if (await onboardingSkip.isVisible()) {
    await onboardingSkip.click();
    await page.waitForSelector('#prologueOverlay', { state: 'hidden' });
  }
  const onboardingRoadmapClose = page.locator('#roadmapClose');
  if (await onboardingRoadmapClose.isVisible()) {
    await onboardingRoadmapClose.click();
    await page.waitForSelector('#roadmapOverlay', { state: 'hidden' });
  }
  await page.waitForFunction(() => document.querySelector('#accountCloudStatus')?.textContent === 'Synced', { timeout: 15000 });
  await page.waitForTimeout(350);
  await page.screenshot({path:`${villageAuditDirectory}/village-${viewportName}.png`,fullPage:false});
  if(cardsVisualOnly){
    const cardsAuditDirectory='test-results/cards-v36-visual-audit';await mkdir(cardsAuditDirectory,{recursive:true});
    await page.click('#bottomNav [data-nav="cards"]');await page.waitForSelector('#deckScreen:not(.hidden)');await page.waitForTimeout(500);
    await page.screenshot({path:`${cardsAuditDirectory}/${viewportName}-collection.png`,fullPage:false});
    const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,art:[...document.querySelectorAll('#deckScreen .card-art-image')].filter(img=>{const r=img.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight}).map(img=>img.complete&&img.naturalWidth>0)}));
    if(state.overflow>2)errors.push(`Cards ${viewportName} overflows horizontally by ${state.overflow}px`);if(state.art.some(ok=>!ok))errors.push(`Cards ${viewportName} contains unloaded tower art.`);
    await page.click('.card-file-tab[data-card-filter="tower"]');await page.waitForTimeout(250);await page.screenshot({path:`${cardsAuditDirectory}/${viewportName}-defense.png`,fullPage:false});
    const target=page.locator('#collectionCards [data-cards-action="inspect"]').first();if(await target.count()){await target.click();await page.waitForSelector('#cardInspectScreen:not(.hidden)');await page.waitForTimeout(250);await page.screenshot({path:`${cardsAuditDirectory}/${viewportName}-detail.png`,fullPage:false});await page.click('#inspectBack');await page.waitForSelector('#deckScreen:not(.hidden)')}
    await page.click('.card-file-tab[data-card-filter="support"]');await page.waitForTimeout(200);await page.screenshot({path:`${cardsAuditDirectory}/${viewportName}-support.png`,fullPage:false});
    await context.close();if(failedAssets.length)errors.push(...failedAssets);return errors;
  }
  if(!battleVisualOnly){
  await page.click('#villageFeedbackBtn');
  await page.waitForSelector('#testerFeedbackModal:not(.hidden)');
  if (await page.locator('[data-feedback-type]').count() !== 3) errors.push('Tester feedback does not expose all three submission types.');
  await page.click('[data-feedback-type="bug"]');
  if (!(await page.locator('#testerBugFields').isVisible())) errors.push('Bug-specific tester feedback fields did not appear.');
  await page.waitForFunction(expected => document.querySelector('#testerAccountId')?.value === expected, userId);
  const accountId = await page.locator('#testerAccountId').inputValue();
  if (accountId !== userId) errors.push(`Tester feedback attached the wrong account ID: ${accountId}`);
  if (mobile) {
    const feedbackOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (feedbackOverflow > 2) errors.push(`Mobile tester feedback overflows horizontally by ${feedbackOverflow}px`);
  } else {
    await page.fill('#testerFeedbackTitle', 'Production smoke feedback');
    await page.fill('#testerFeedbackDescription', 'Validates the V35.2 tester feedback submission pipeline.');
    await page.fill('#testerSteps', 'Open tester feedback and submit a bug report.');
    await page.fill('#testerExpected', 'The report is accepted.');
    await page.fill('#testerActual', 'The report is accepted by the mocked endpoint.');
    await page.click('#testerFeedbackSubmit');
    await page.waitForFunction(() => document.querySelector('#testerFeedbackStatus')?.dataset.kind === 'success');
  }
  await page.click('#testerFeedbackClose');
  await page.click('#audioBtn');
  if (!(await page.locator('.settings-feedback-btn').isVisible())) errors.push('Settings menu tester feedback entry is not visible.');
  await page.click('#audioClose');
  if (await page.locator('#moreScreen [data-feedback-open]').count() !== 1) errors.push('More menu tester feedback entry is missing.');
  }

  if (mobile&&battleVisualOnly){
    const started=await page.evaluate(()=>window.VillageBattleAPI.startVisualAuditStage(5));
    if(!started?.ok)errors.push(`Mobile battle audit failed to start: ${started?.reason}`);
    await page.waitForFunction(()=>document.body.classList.contains('battle-mode'));
    await page.waitForTimeout(900);await page.evaluate(()=>window.VillageBattleAPI.prepareVisualAudit());
    const auditDirectory='test-results/battle-visual-audit';await mkdir(auditDirectory,{recursive:true});
    await page.screenshot({path:`${auditDirectory}/${viewport.width<600?'iphone':'ipad'}-runtime.png`,fullPage:false});
  }
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
    const auditDirectory = 'test-results/battle-visual-audit';
    await mkdir(auditDirectory, { recursive: true });
    for (let stage = 1; stage <= 20; stage++) {
      const started = await page.evaluate(value => window.VillageBattleAPI.startVisualAuditStage(value), stage);
      if (!started?.ok) { errors.push(`Visual audit could not initialize Stage ${stage}: ${started?.reason}`); continue; }
      await page.waitForTimeout(700);
      await page.evaluate(() => window.VillageBattleAPI.prepareVisualAudit());
      await page.screenshot({ path: `${auditDirectory}/stage-${String(stage).padStart(2,'0')}.png`, fullPage: false });
      const state = await page.evaluate(() => window.VillageBattleAPI.state());
      if (state.chapter !== stage) errors.push(`Visual audit initialized Stage ${state.chapter} instead of ${stage}.`);
    }
    await page.evaluate(() => window.VillageBattleAPI.startVisualAuditStage(10));
    await page.waitForTimeout(1400); await page.evaluate(() => window.VillageBattleAPI.prepareVisualAudit());
    for (const progress of [0,.25,.5,.75,1]) {
      await page.evaluate(value => window.VillageBattleAPI.setVisualAuditTravelProgress(value),progress);
      await page.waitForTimeout(120);
      await page.evaluate(() => window.VillageBattleAPI.prepareVisualAudit());
      await page.screenshot({path:`${auditDirectory}/road-travel-${String(Math.round(progress*100)).padStart(3,'0')}.png`,fullPage:false});
    }
    for(const [stage,waves] of [[5,[1,5,8,12]],[10,[1,4,7,10]],[11,[1,4,7,12]]]){
      await page.evaluate(value=>window.VillageBattleAPI.startVisualAuditStage(value),stage);await page.waitForTimeout(700);await page.evaluate(()=>window.VillageBattleAPI.prepareVisualAudit());
      let previousRoutes=1;
      for(const wave of waves){const roadState=await page.evaluate(value=>window.VillageBattleAPI.setVisualAuditRoadWave(value),wave);if(!roadState?.ok)errors.push(`Road audit failed at Stage ${stage}, Wave ${wave}: ${roadState?.reason}`);if((roadState?.routes?.length||0)<previousRoutes)errors.push(`Road count regressed at Stage ${stage}, Wave ${wave}.`);previousRoutes=roadState?.routes?.length||previousRoutes;await page.screenshot({path:`${auditDirectory}/stage-${stage}-road-wave-${String(wave).padStart(2,'0')}.png`,fullPage:false});}
      const expected=stage>=11?3:2;if(previousRoutes!==expected)errors.push(`Stage ${stage} exposed ${previousRoutes} routes; expected ${expected}.`);
    }
    const soakResults=[];
    const defeatRestart=await page.evaluate(cycles=>window.VillageBattleAPI.runDefeatRestartSoak(cycles),battleVisualOnly?1:20);
    if(!defeatRestart?.ok)errors.push(`Defeat/restart soak failed after ${defeatRestart?.cycle||0} cycles: ${defeatRestart?.reason||'unknown'}\n${JSON.stringify(defeatRestart?.snapshot||{},null,2)}`);
    else console.log(`Defeat/restart soak passed: ${defeatRestart.cycles} consecutive loss/restart cycles.`);
    for(const stage of (battleVisualOnly?[10]:[4,5,6,10]))soakResults.push(await page.evaluate(([value,seconds])=>window.VillageBattleAPI.runSoak(value,seconds),[stage,battleVisualOnly?8:600]));
    if(!battleVisualOnly)for(const stage of [4,5,6,4,5,6])soakResults.push(await page.evaluate(value=>window.VillageBattleAPI.runSoak(value,120),stage));
    for(const result of soakResults){if(!result?.ok)errors.push(`Battle soak failed at Stage ${result?.stage||'?'}: ${result?.reason||'unknown'}`);if(result?.maxima?.particles>420)errors.push(`Battle soak exceeded particle cap at Stage ${result.stage}: ${result.maxima.particles}`);if(result?.final?.shots>12)errors.push(`Battle soak left excessive projectiles at Stage ${result.stage}: ${result.final.shots}`)}
    console.log('Battle soak results:',JSON.stringify(soakResults.map(result=>({ok:result.ok,stage:result.stage,state:result.state,wave:result.wave,hp:result.hp,reason:result.reason,maxima:result.maxima,final:result.final})),null,2));
    await page.evaluate(() => window.VillageBattleAPI.startVisualAuditStage(10));
    await page.waitForTimeout(700);
    const finaleStarted = await page.evaluate(() => window.VillageBattleAPI.testStageTenFinale());
    if (!finaleStarted?.ok) errors.push(`Stage 10 finale did not start: ${finaleStarted?.reason}`);
    await page.waitForSelector('#chapterTenCinematic.phase-walk', { timeout: 5000 });
    await page.waitForSelector('#chapterTenCinematic.phase-relic', { timeout: 5000 });
    await page.waitForSelector('#chapterTenCinematic.phase-transform', { timeout: 5000 });
    await page.waitForSelector('#chapterTenCinematic.phase-reveal', { timeout: 5000 });
    await page.waitForSelector('#chapterTenCinematic', { state: 'hidden', timeout: 5000 });
    const finaleState = await page.evaluate(() => window.VillageBattleAPI.state());
    if (!finaleState.draculaTooth || finaleState.shadowLevel < 2) errors.push('Stage 10 finale did not persist Dracula\'s Tooth and Shadow Level II.');
    await page.waitForFunction(() => document.querySelector('#accountCloudStatus')?.textContent === 'Synced', { timeout: 15000 });
    await page.evaluate(() => window.VillageBattleAPI.menu());
    await page.waitForFunction(() => !document.body.classList.contains('battle-mode'));
    await page.evaluate(() => document.querySelector('#bottomNav [data-nav="campaign"]')?.click());
    await page.waitForSelector('#campaignScreen:not(.hidden)');
    await page.locator('#chapterMap .chapter-node button:not([disabled])').first().click();
    await page.waitForFunction(() => document.body.classList.contains('battle-mode'));
    await page.waitForTimeout(3500);
    await page.evaluate(() => {
      if (window.VillageBattleAPI.state().paused) window.VillageBattleAPI.pause();
    });
    await page.click('#pauseBtn');
    await page.waitForSelector('#battlePausePanel:not(.hidden)');
    if (await page.locator('#battlePausePanel [data-feedback-open]').count() !== 3) errors.push('Pause menu does not expose all three feedback options.');
    await page.click('#battlePausePanel [data-feedback-open="bug"]');
    await page.waitForSelector('#testerFeedbackModal:not(.hidden)');
    await page.click('#testerFeedbackClose');
    await page.click('#battlePauseResume');
    await page.waitForSelector('#battlePausePanel', { state: 'hidden' });
    await page.evaluate(() => window.VillageBattleAPI.menu());
    await page.waitForFunction(() => !document.body.classList.contains('battle-mode'));

    await page.click('#bottomNav [data-nav="cards"]');
    await page.waitForSelector('#deckScreen:not(.hidden)');
    const cardsAuditDirectory = 'test-results/cards-v36-visual-audit';
    await mkdir(cardsAuditDirectory, { recursive: true });
    await page.waitForTimeout(500);
    await page.screenshot({path:`${cardsAuditDirectory}/${viewportName}-collection.png`,fullPage:false});
    const cardVisualState=await page.evaluate(() => ({
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      art:[...document.querySelectorAll('#deckScreen .card-art-image')].map(img=>({src:img.currentSrc||img.src,loaded:img.complete&&img.naturalWidth>0})),
      cards:document.querySelectorAll('#collectionCards .portrait-card').length
    }));
    if(cardVisualState.overflow>2)errors.push(`Cards ${viewportName} overflows horizontally by ${cardVisualState.overflow}px`);
    if(cardVisualState.art.some(image=>!image.loaded))errors.push(`Cards ${viewportName} contains unloaded tower art.`);
    await page.click('.card-file-tab[data-card-filter="tower"]');
    await page.waitForTimeout(250);
    await page.screenshot({path:`${cardsAuditDirectory}/${viewportName}-defense.png`,fullPage:false});
    const detailTarget=page.locator('#collectionCards [data-cards-action="inspect"]').first();
    if(await detailTarget.count()){
      await detailTarget.click();
      await page.waitForSelector('#cardInspectScreen:not(.hidden)');
      await page.waitForTimeout(250);
      await page.screenshot({path:`${cardsAuditDirectory}/${viewportName}-detail.png`,fullPage:false});
      await page.click('#inspectBack');
      await page.waitForSelector('#deckScreen:not(.hidden)');
    }
    await page.click('.card-file-tab[data-card-filter="support"]');
    await page.waitForTimeout(200);
    await page.screenshot({path:`${cardsAuditDirectory}/${viewportName}-support.png`,fullPage:false});
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

async function runUnavailableAuthCheck(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const expiredSession = { ...session, expires_at: nowSeconds - 60 };
  await context.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, {
    key: 'sb-ulsixgjgppiqouqdppvv-auth-token',
    value: expiredSession
  });
  await context.route('https://ulsixgjgppiqouqdppvv.supabase.co/**', route => route.abort('internetdisconnected'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(`Unavailable-auth page error: ${error.message}`));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForSelector('[data-auth-view="login"]:not(.hidden)', { timeout: 22000 });
    const stillPending = await page.evaluate(() => document.documentElement.classList.contains('auth-pending'));
    if (stillPending) errors.push('Unavailable auth left the application in auth-pending state.');
  } catch {
    errors.push('Unavailable auth did not dismiss the startup splash and reveal login.');
  }
  await context.close();
  return errors;
}

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-webgl', '--autoplay-policy=no-user-gesture-required']
});
try {
  const desktopErrors = await runViewport(browser, { width: 1440, height: 900 });
  const tabletErrors = await runViewport(browser, { width: 1024, height: 768 }, true);
  const mobileErrors = await runViewport(browser, { width: 390, height: 844 }, true);
  const unavailableAuthErrors = battleVisualOnly||cardsVisualOnly?[]:await runUnavailableAuthCheck(browser);
  const errors = [...desktopErrors, ...tabletErrors, ...mobileErrors, ...unavailableAuthErrors];
  if (errors.length) {
    console.error(`Production smoke test failed:\n${errors.map(error => `- ${error}`).join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log('Production smoke test passed: auth/cloud bootstrap, unavailable-auth fallback, Village 3D, battle, Ascension views, companions, desktop, iPad, and iPhone layouts loaded without runtime errors or asset 404s.');
  }
} finally {
  await browser.close();
}
