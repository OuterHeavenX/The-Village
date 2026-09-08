// One place to ask "is development tooling on, and which part of it".
//
// The project had four separate answers scattered across four modules:
// `import.meta.env.DEV`, `?visualAudit=1`, `?visualDebug=1` plus a
// `villageVisualDebug` storage key, and `?runtimeProof`. Nothing documented
// them together, and because most were tied to import.meta.env.DEV the battle
// telemetry overlay and the state validator — the tools that would actually
// explain a tester's bug report — were compiled out of every deployed build.
//
// Channels:
//   overlay      on-screen battle telemetry (FPS, wave, entity and tower counts)
//   diagnostics  error history, non-finite state validation, canvas context loss
//   visual       battlefield debug drawing (placement and cathedral overlays)
//   proof        renderer runtime proof output
//
// Enable on a deployed build with ?debug=1 (all channels) or a comma list such
// as ?debug=overlay,visual. The choice is remembered for the browser until
// ?debug=0 clears it. A development server enables everything by default.
//
// Deliberately NOT covered here: ?balanceProfile, which swaps the live save for
// a synthetic benchmark profile. That stays gated on import.meta.env.DEV so it
// can never be turned on against a real player's progress.

export const DEBUG_CHANNELS = Object.freeze(['overlay', 'diagnostics', 'visual', 'proof']);

const STORAGE_KEY = 'village.debug';
const LEGACY_VISUAL_KEY = 'villageVisualDebug';

function readStorage(key) {
  try {
    return globalThis.localStorage?.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeStorage(key, value) {
  try {
    if (value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, value);
  } catch {
    // Private browsing and disabled storage are not errors here.
  }
}

function parseChannels(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw || raw === '0' || raw === 'false' || raw === 'off') return [];
  if (raw === '1' || raw === 'true' || raw === 'on' || raw === 'all') return [...DEBUG_CHANNELS];
  return raw.split(/[,\s]+/).filter(channel => DEBUG_CHANNELS.includes(channel));
}

function resolve() {
  const search = new URLSearchParams(globalThis.location?.search || '');
  const active = new Set(import.meta.env.DEV ? DEBUG_CHANNELS : []);

  if (search.has('debug')) {
    const requested = parseChannels(search.get('debug'));
    for (const channel of requested) active.add(channel);
    writeStorage(STORAGE_KEY, requested.length ? requested.join(',') : null);
    if (!requested.length) for (const channel of DEBUG_CHANNELS) active.delete(channel);
  } else {
    for (const channel of parseChannels(readStorage(STORAGE_KEY))) active.add(channel);
  }

  // Flags that predate this module, still honoured so existing tooling,
  // bookmarks and the visual-audit scripts keep working unchanged.
  if (search.get('visualAudit') === '1') active.add('diagnostics');
  if (search.get('visualDebug') === '1' || readStorage(LEGACY_VISUAL_KEY) === '1') active.add('visual');
  if (search.has('runtimeProof')) active.add('proof');

  return active;
}

const activeChannels = resolve();

export function debugEnabled(channel = 'diagnostics') {
  return activeChannels.has(channel);
}

export const DEBUG = activeChannels.size > 0;

export function debugSummary() {
  return [...activeChannels].sort().join(',') || 'off';
}
