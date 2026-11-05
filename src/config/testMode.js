// V37.5 — "Unlock everything" test mode.
//
//   …/The-Village/?unlockall     turn it on (remembered on this browser)
//   …/The-Village/?unlockall=0   turn it off
//
// Turning it on first copies this browser's real save aside; while it is on
// every chapter is open and every card is unlocked, and anything you do is
// played on that copy. Turning it off throws the test progress away and puts
// the real save back exactly as it was.
//
// This module must load before the game reads its save, so main.js imports it
// first. The backup lives under the "vtb:" prefix, which none of the save,
// reset or cloud-sync code treats as a save key.

const FLAG = 'vtb:active';
const PREFIX = 'vtb:save:';
const SAVE_KEY = /^(relicsEclipse|gateRunner|rotkVillage|rotk\.village\.|theVillage|village\.)/;
const NOT_SAVE = /^village\.(cloud\.|saveRecovery\.|feedback\.|debug$)/;
const isSaveKey = key => (SAVE_KEY.test(key) || key === 'villageFreshStartToken') && !NOT_SAVE.test(key);

function storage() { try { return window.localStorage; } catch { return null; } }

function turnOn(ls) {
  if (ls.getItem(FLAG) === '1') return;
  for (const key of Object.keys(ls)) if (key.startsWith(PREFIX)) ls.removeItem(key);
  for (const key of Object.keys(ls)) if (isSaveKey(key)) ls.setItem(PREFIX + key, ls.getItem(key));
  ls.setItem(FLAG, '1');
}
function turnOff(ls) {
  if (ls.getItem(FLAG) !== '1') return;
  for (const key of Object.keys(ls)) if (isSaveKey(key)) ls.removeItem(key);
  for (const key of Object.keys(ls)) if (key.startsWith(PREFIX)) { ls.setItem(key.slice(PREFIX.length), ls.getItem(key)); ls.removeItem(key); }
  ls.removeItem(FLAG);
}

let active = false;
try {
  const ls = storage();
  const param = new URLSearchParams(location.search).get('unlockall');
  if (ls) {
    if (param === '0' || param === 'off' || param === 'false') turnOff(ls);
    else if (param !== null) turnOn(ls);
    active = ls.getItem(FLAG) === '1';
  }
} catch (error) { console.warn('[TestMode] unavailable', error); }

export function testUnlockAll() { return active; }

if (active) {
  const badge = () => {
    if (document.getElementById('testModeBadge')) return;
    const el = document.createElement('a');
    el.id = 'testModeBadge';
    el.href = '?unlockall=0';
    el.title = 'Test mode: every chapter and card is unlocked on a copy of your save. Click to leave test mode and restore your real save.';
    el.textContent = 'TEST MODE ✕';
    el.style.cssText = 'position:fixed;left:50%;top:calc(2px + env(safe-area-inset-top));transform:translateX(-50%);z-index:2147483000;padding:1px 8px;border-radius:999px;white-space:nowrap;font:800 9px/1.5 system-ui,sans-serif;letter-spacing:.08em;color:#1a1206;background:#f3dc9c;box-shadow:0 2px 8px #000a;text-decoration:none;opacity:.88';
    document.body.append(el);
  };
  if (document.body) badge(); else addEventListener('DOMContentLoaded', badge);
}

// V37.6.1: an in-game switch on the More screen, so test mode does not depend
// on typing the URL (home-screen and bookmarked copies drop the ?unlockall).
function wireTile() {
  const tile = document.getElementById('testModeTile');
  if (!tile || tile.dataset.wired) return;
  tile.dataset.wired = '1';
  const label = tile.querySelector('b'), note = tile.querySelector('small');
  if (active) { label.textContent = 'Test Mode: ON'; note.textContent = 'Every chapter and card is open. Tap to leave and restore your real save.'; tile.style.boxShadow = '0 0 0 2px #f3dc9c inset'; }
  tile.addEventListener('click', () => {
    const ok = active || window.confirm('Turn on Test Mode?\n\nEvery chapter and card unlocks. Your real save is copied aside first, and comes back exactly as it was when you leave Test Mode.');
    if (!ok) return;
    const url = new URL(location.href);
    url.searchParams.set('unlockall', active ? '0' : '1');
    location.href = url.toString();
  });
}
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', wireTile); else wireTile();
