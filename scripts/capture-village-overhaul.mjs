import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const baseUrl=process.env.TEST_BASE_URL||'http://127.0.0.1:4192';
const chromePath=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const out='test-results/village-overhaul-runtime';
const uid='11111111-1111-4111-8111-111111111111';
const now=Math.floor(Date.now()/1000);const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const session={access_token:`${enc({alg:'HS256',typ:'JWT'})}.${enc({aud:'authenticated',exp:now+3600,iat:now,sub:uid,email:'visual@the-village.test',role:'authenticated'})}.test`,token_type:'bearer',expires_in:3600,expires_at:now+3600,refresh_token:'visual-refresh',user:{id:uid,aud:'authenticated',role:'authenticated',email:'visual@the-village.test',user_metadata:{display_name:'Visual Tester'},identities:[],created_at:new Date().toISOString()}};

async function mock(context){
  await context.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:'sb-ulsixgjgppiqouqdppvv-auth-token',value:session});
  await context.route('https://ulsixgjgppiqouqdppvv.supabase.co/**',route=>{const url=new URL(route.request().url());const body=url.pathname.includes('/auth/v1/user')?session.user:url.pathname.includes('/auth/v1/token')?session:url.pathname.includes('/rest/v1/profiles')?[{id:uid,display_name:'Visual Tester',game_version:'35.2.0'}]:url.pathname.includes('/rest/v1/player_saves')?[]:{};return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
}
async function open(viewport,mobile=false){
  const context=await browser.newContext({viewport,deviceScaleFactor:mobile?2:1,hasTouch:mobile,isMobile:mobile});await mock(context);const page=await context.newPage();
  const failures=[];page.on('pageerror',e=>failures.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(baseUrl))failures.push(`${r.status()} ${r.url()}`)});
  await page.goto(`${baseUrl}/?visualAudit=1`,{waitUntil:'domcontentloaded'});await page.waitForSelector('#villageThreeCanvas',{timeout:25000});await page.waitForTimeout(2200);
  for(const id of ['prologueSkip','roadmapClose']){const el=page.locator(`#${id}`);if(await el.isVisible())await el.click()}
  return {context,page,failures};
}
async function move(page,key,ms){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);await page.waitForTimeout(900)}

await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:chromePath,headless:true,args:['--disable-gpu-sandbox']});
try{
  const desktop=await open({width:1600,height:1000});
  await desktop.page.screenshot({path:`${out}/01-normal-gameplay.png`});
  await desktop.page.waitForFunction(()=>window.VillageVisualAudit?.setVisualAuditPosition);
  await desktop.page.evaluate(()=>window.VillageVisualAudit.setVisualAuditPosition(0,-24));await desktop.page.waitForTimeout(900);await desktop.page.screenshot({path:`${out}/02-cathedral.png`});
  await desktop.page.evaluate(()=>window.VillageVisualAudit.setVisualAuditPosition(-34,1));await desktop.page.waitForTimeout(900);await desktop.page.screenshot({path:`${out}/03-residential.png`});
  await desktop.page.evaluate(()=>window.VillageVisualAudit.setVisualAuditPosition(31,-26));await desktop.page.waitForTimeout(900);await desktop.page.screenshot({path:`${out}/04-production-economic.png`});
  await desktop.page.click('#villageBuildBtn');await desktop.page.waitForTimeout(800);await desktop.page.screenshot({path:`${out}/05-build-mode.png`});
  const wide=await open({width:1920,height:1080});await wide.page.screenshot({path:`${out}/06-wide-overview.png`});
  const ipad=await open({width:1024,height:1366},true);await ipad.page.screenshot({path:`${out}/07-ipad.png`});
  const iphone=await open({width:430,height:932},true);await iphone.page.screenshot({path:`${out}/08-iphone.png`});
  await iphone.page.click('#villageFeedbackBtn');
  await iphone.page.waitForSelector('#testerFeedbackModal:not(.hidden)');
  await iphone.page.click('#testerFeedbackClose');
  const failures=[...desktop.failures,...wide.failures,...ipad.failures,...iphone.failures];if(failures.length)throw new Error(failures.join('\n'));
  console.log(`Captured eight production Village views in ${out}`);
  await Promise.all([desktop.context.close(),wide.context.close(),ipad.context.close(),iphone.context.close()]);
}finally{await browser.close()}
