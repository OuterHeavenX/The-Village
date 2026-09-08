// The Battle 4.0 switch. On by default since Stage C (docs/BATTLE_4_DESIGN.md);
// the classic 2D board remains the fallback when WebGL is unavailable and can
// be chosen explicitly.
//
// `?battle3d=0` turns the 3D battlefield off for this browser and `?battle3d=1`
// turns it back on; the choice is remembered in localStorage so a tester can
// keep playing without the query string. The ♫ panel toggle writes the same
// key. Deliberately not part of the save (and so not cloud-synced): it is a
// device capability choice, not progress.

const STORAGE_KEY = 'village.battle3d';

function readStorage() {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeStorage(value) {
  try {
    if (value === null) globalThis.localStorage?.removeItem(STORAGE_KEY);
    else globalThis.localStorage?.setItem(STORAGE_KEY, value);
  } catch {
    // Storage may be disabled; the query string still works for one session.
  }
}

let cached = null;

const DEFAULT_ON = true;

function resolve() {
  const search = new URLSearchParams(globalThis.location?.search || '');
  if (search.has('battle3d')) {
    const raw = String(search.get('battle3d') || '').toLowerCase();
    const on = !(raw === '0' || raw === 'false' || raw === 'off');
    writeStorage(on ? '1' : '0');
    return on;
  }
  const stored = readStorage();
  if (stored === '1') return true;
  if (stored === '0') return false;
  return DEFAULT_ON;
}

export function battle3dEnabled() {
  if (cached === null) cached = resolve();
  return cached;
}

export function setBattle3dEnabled(on) {
  cached = !!on;
  writeStorage(cached ? '1' : '0');
  return cached;
}
