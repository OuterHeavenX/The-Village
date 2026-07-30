import { supabase } from './supabaseClient.js';
import { RELEASE_VERSION } from '../config/release.js';

export const GAME_VERSION = RELEASE_VERSION;
export const CLOUD_SAVE_SCHEMA_VERSION = 1;
const CLOUD_FORMAT = 'the-village-cloud-save';
const CLOUD_DEBOUNCE_MS = 5000;
const SAVE_KEY_PATTERN = /^(relicsEclipse|gateRunner|rotkVillage|theVillage|village\.)/;
const EXCLUDED_KEY_PATTERN = /^village\.(cloud\.|saveRecovery\.)/;

let activeUser = null;
let activeProfile = null;
let revision = 0;
let saveProvider = null;
let debounceTimer = 0;
let retryTimer = 0;
let periodicTimer = 0;
let retryAttempt = 0;
let saveRunning = false;
let saveQueued = false;
let pendingReason = '';
let lastSuccessfulSync = null;
let sessionStartedAt = Date.now();
let profilePlayTimeBase = 0;
let autosaveListenersStarted = false;
let lastSyncedFingerprint = '';
let status = { state: 'idle', message: 'Cloud save unavailable', lastSuccessfulSync: null };

function emitStatus(state, message) {
  status = { state, message, lastSuccessfulSync };
  window.dispatchEvent(new CustomEvent('village-cloud-status', { detail: status }));
}

export function getCloudStatus() {
  return { ...status };
}

export function registerSaveProvider(provider) {
  saveProvider = typeof provider === 'function' ? provider : null;
}

function isAllowedSaveKey(key) {
  return (SAVE_KEY_PATTERN.test(key) || key === 'villageFreshStartToken') &&
    !EXCLUDED_KEY_PATTERN.test(key);
}

export function collectLocalSaveEntries() {
  const entries = {};
  try {
    for (const key of Object.keys(localStorage)) {
      if (isAllowedSaveKey(key)) entries[key] = localStorage.getItem(key);
    }
    if (saveProvider) {
      const primary = saveProvider();
      if (primary && typeof primary === 'object') entries.relicsEclipseSave = JSON.stringify(primary);
    }
  } catch (error) {
    console.warn('Cloud save could not collect local progress.', error?.message || error);
  }
  return entries;
}

function validPrimarySave(entries) {
  const raw = entries?.relicsEclipseSave || entries?.gateRunnerSave;
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return !!parsed && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

function saveFingerprint(entries = collectLocalSaveEntries()) {
  return Object.keys(entries).sort().map(key => `${key}\u0000${entries[key]}`).join('\u0001');
}

function makeCloudPayload() {
  return {
    format: CLOUD_FORMAT,
    schemaVersion: CLOUD_SAVE_SCHEMA_VERSION,
    gameVersion: GAME_VERSION,
    savedAt: new Date().toISOString(),
    entries: collectLocalSaveEntries()
  };
}

function currentGameSaveVersion(entries = collectLocalSaveEntries()) {
  try {
    const primary = saveProvider?.() || JSON.parse(entries.relicsEclipseSave || entries.gateRunnerSave || '{}');
    return Math.max(1, Number(primary?.saveVersion) || CLOUD_SAVE_SCHEMA_VERSION);
  } catch {
    return CLOUD_SAVE_SCHEMA_VERSION;
  }
}

function normalizeCloudPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Cloud save data is invalid.');
  if (payload.format === CLOUD_FORMAT && payload.entries && typeof payload.entries === 'object') return payload.entries;
  // Early development records may contain only the primary game object.
  return { relicsEclipseSave: JSON.stringify(payload) };
}

function restoreCloudPayload(payload) {
  const entries = normalizeCloudPayload(payload);
  let restored = 0;
  for (const [key, value] of Object.entries(entries)) {
    if (isAllowedSaveKey(key) && typeof value === 'string') {
      localStorage.setItem(key, value);
      restored++;
    }
  }
  if (!restored) throw new Error('Cloud save contained no recognized Village progress.');
}

function migrationKey(userId) {
  return `village.cloud.migrated.${userId}`;
}

function isNetworkFailure(error) {
  return !navigator.onLine ||
    error?.name === 'AbortError' ||
    error?.name === 'TimeoutError' ||
    /failed to fetch|network|load failed|fetch|abort|timed out/i.test(String(error?.message || error || ''));
}

function canUseOfflineFallback(userId) {
  return !!localStorage.getItem(migrationKey(userId)) && validPrimarySave(collectLocalSaveEntries());
}

function cacheKey(userId) {
  return `village.cloud.cache.${userId}`;
}

function switchLocalAccount(userId) {
  const ownerKey = 'village.cloud.localOwner';
  const previousOwner = localStorage.getItem(ownerKey);
  if (previousOwner && previousOwner !== userId) {
    localStorage.setItem(cacheKey(previousOwner), JSON.stringify(collectLocalSaveEntries()));
    for (const key of Object.keys(localStorage)) {
      if (isAllowedSaveKey(key)) localStorage.removeItem(key);
    }
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey(userId)) || 'null');
      if (cached && typeof cached === 'object') {
        for (const [key, value] of Object.entries(cached)) {
          if (isAllowedSaveKey(key) && typeof value === 'string') localStorage.setItem(key, value);
        }
      }
    } catch (error) {
      console.warn('Account-specific local fallback was unreadable.', error?.message || error);
    }
  }
  localStorage.setItem(ownerKey, userId);
}

async function ensureProfile(user, displayName = '') {
  const metadataName = String(displayName || user.user_metadata?.display_name || '').trim();
  const fallbackName = String(user.email || 'Village Player').split('@')[0].slice(0, 40) || 'Village Player';
  const safeName = (metadataName || fallbackName).slice(0, 40);
  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('display_name,total_play_time_seconds,last_login_at,last_seen_at,game_version')
    .eq('id', user.id)
    .maybeSingle();
  if (readError) throw readError;
  const now = new Date().toISOString();
  const profileRow = {
    id: user.id,
    display_name: existing?.display_name || safeName,
    last_login_at: now,
    last_seen_at: now,
    game_version: GAME_VERSION
  };
  const { data, error } = await supabase.from('profiles').upsert(profileRow, { onConflict: 'id' }).select().single();
  if (error) throw error;
  activeProfile = data;
  profilePlayTimeBase = Number(data.total_play_time_seconds) || 0;
  sessionStartedAt = Date.now();
  return data;
}

async function createInitialCloudSave(userId, payload) {
  const row = {
    user_id: userId,
    save_version: currentGameSaveVersion(payload.entries),
    game_version: GAME_VERSION,
    save_data: payload,
    revision: 1,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase.from('player_saves').insert(row).select('revision,updated_at').single();
  if (error) throw error;
  revision = Number(data.revision) || 1;
  lastSuccessfulSync = data.updated_at || new Date().toISOString();
  lastSyncedFingerprint = saveFingerprint(payload.entries);
}

export async function initializeCloudForSession(session, displayName = '') {
  if (!supabase || !session?.user) throw new Error('An authenticated Supabase session is required.');
  activeUser = session.user;
  switchLocalAccount(activeUser.id);
  emitStatus('loading', 'Loading player profile…');
  try {
    await ensureProfile(activeUser, displayName);
  } catch (error) {
    if (!isNetworkFailure(error) || !canUseOfflineFallback(activeUser.id)) throw error;
    activeProfile = {
      display_name: activeUser.user_metadata?.display_name || String(activeUser.email || 'Village Player').split('@')[0]
    };
    emitStatus('offline', 'Offline — saved locally');
    return { mode: 'offline-local', profile: activeProfile };
  }
  emitStatus('loading', 'Loading cloud save…');
  const { data: cloudRow, error } = await supabase
    .from('player_saves')
    .select('save_data,revision,updated_at,save_version,game_version')
    .eq('user_id', activeUser.id)
    .maybeSingle();
  if (error) {
    if (isNetworkFailure(error) && canUseOfflineFallback(activeUser.id)) {
      emitStatus('offline', 'Offline — saved locally');
      return { mode: 'offline-local', profile: activeProfile };
    }
    throw error;
  }

  const localEntries = collectLocalSaveEntries();
  const hasLocal = validPrimarySave(localEntries);
  if (cloudRow?.save_data) {
    if (hasLocal) console.warn('Both local and cloud saves exist; cloud progress was selected without merging.');
    for (const key of Object.keys(localStorage)) {
      if (isAllowedSaveKey(key)) localStorage.removeItem(key);
    }
    restoreCloudPayload(cloudRow.save_data);
    revision = Number(cloudRow.revision) || 1;
    lastSuccessfulSync = cloudRow.updated_at || null;
    localStorage.setItem(migrationKey(activeUser.id), 'cloud-loaded');
    lastSyncedFingerprint = saveFingerprint();
    emitStatus('saved', 'Synced');
    return { mode: 'cloud', profile: activeProfile };
  }

  if (hasLocal) {
    emitStatus('loading', 'Migrating local progress…');
    await createInitialCloudSave(activeUser.id, {
      format: CLOUD_FORMAT,
      schemaVersion: CLOUD_SAVE_SCHEMA_VERSION,
      gameVersion: GAME_VERSION,
      savedAt: new Date().toISOString(),
      entries: localEntries
    });
    localStorage.setItem(migrationKey(activeUser.id), 'local-uploaded');
    emitStatus('saved', 'Synced');
    return { mode: 'migrated-local', profile: activeProfile };
  }

  revision = 0;
  emitStatus('loading', 'Preparing a new kingdom…');
  return { mode: 'new', profile: activeProfile };
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  const delay = Math.min(300000, 15000 * Math.pow(2, Math.min(4, retryAttempt++)));
  retryTimer = window.setTimeout(() => flushCloudSave('retry'), delay);
}

async function updateProfilePresence() {
  if (!activeUser) return;
  const elapsed = Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000));
  const { error } = await supabase.from('profiles').update({
    last_seen_at: new Date().toISOString(),
    game_version: GAME_VERSION,
    total_play_time_seconds: profilePlayTimeBase + elapsed
  }).eq('id', activeUser.id);
  if (error) console.warn('Profile presence update deferred.', error.message);
}

async function writeCloudSave(reason) {
  const payload = makeCloudPayload();
  const now = new Date().toISOString();
  if (!revision) {
    await createInitialCloudSave(activeUser.id, payload);
    localStorage.setItem(migrationKey(activeUser.id), 'new-cloud-created');
    return;
  }
  const nextRevision = revision + 1;
  const { data, error } = await supabase.from('player_saves').update({
    save_version: currentGameSaveVersion(payload.entries),
    game_version: GAME_VERSION,
    save_data: payload,
    revision: nextRevision,
    updated_at: now
  }).eq('user_id', activeUser.id).eq('revision', revision).select('revision,updated_at').maybeSingle();
  if (error) throw error;
  if (!data) {
    const conflict = new Error('Cloud save changed on another device. Reload before saving again.');
    conflict.code = 'CLOUD_REVISION_CONFLICT';
    throw conflict;
  }
  revision = Number(data.revision) || nextRevision;
  lastSuccessfulSync = data.updated_at || now;
  lastSyncedFingerprint = saveFingerprint(payload.entries);
  if (reason !== 'presence') await updateProfilePresence();
}

export function queueCloudSave(reason = 'progress') {
  if (!activeUser) return;
  pendingReason = reason;
  saveQueued = true;
  emitStatus(
    navigator.onLine ? 'pending' : 'offline',
    navigator.onLine ? 'Saved locally — cloud sync pending' : 'Offline — saved locally'
  );
  clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => flushCloudSave(reason), CLOUD_DEBOUNCE_MS);
}

function queueCloudSaveIfChanged(reason) {
  if (!activeUser || saveFingerprint() === lastSyncedFingerprint) return false;
  queueCloudSave(reason);
  return true;
}

export async function flushCloudSave(reason = 'flush') {
  clearTimeout(debounceTimer);
  if (!activeUser || !saveQueued) return true;
  if (saveRunning) {
    saveQueued = true;
    return false;
  }
  if (!navigator.onLine) {
    emitStatus('offline', 'Offline — saved locally');
    scheduleRetry();
    return false;
  }
  saveRunning = true;
  saveQueued = false;
  const writeReason = pendingReason || reason;
  emitStatus('saving', 'Saving…');
  try {
    await writeCloudSave(writeReason);
    retryAttempt = 0;
    lastSuccessfulSync = lastSuccessfulSync || new Date().toISOString();
    emitStatus('saved', 'Synced');
    return true;
  } catch (error) {
    saveQueued = true;
    if (error?.code === 'CLOUD_REVISION_CONFLICT') {
      emitStatus('conflict', 'Cloud save changed elsewhere — reload required');
      console.warn(error.message);
    } else {
      emitStatus('pending', navigator.onLine ? 'Cloud save failed — retrying' : 'Offline — saved locally');
      console.warn('Cloud save deferred.', error?.message || error);
      scheduleRetry();
    }
    return false;
  } finally {
    saveRunning = false;
    if (saveQueued && retryAttempt === 0) {
      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => flushCloudSave('queued'), 750);
    }
  }
}

export function startCloudAutosave() {
  clearInterval(periodicTimer);
  periodicTimer = window.setInterval(() => queueCloudSaveIfChanged('periodic'), 45000);
  if (autosaveListenersStarted) return;
  autosaveListenersStarted = true;
  window.addEventListener('online', () => {
    if (queueCloudSaveIfChanged('reconnected')) flushCloudSave('reconnected');
    else emitStatus('saved', 'Synced');
  });
  window.addEventListener('offline', () => emitStatus('offline', 'Offline — saved locally'));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) queueCloudSaveIfChanged('resume');
    else flushCloudSave('background');
  });
}

export function getActiveAccount() {
  return activeUser ? {
    displayName: activeProfile?.display_name || activeUser.user_metadata?.display_name || 'Village Player',
    email: activeUser.email || ''
  } : null;
}

export function clearCloudRuntime() {
  if (activeUser) {
    try { localStorage.setItem(cacheKey(activeUser.id), JSON.stringify(collectLocalSaveEntries())); } catch (_) {}
  }
  activeUser = null;
  activeProfile = null;
  revision = 0;
  saveProvider = null;
  saveQueued = false;
  saveRunning = false;
  lastSyncedFingerprint = '';
  clearTimeout(debounceTimer);
  clearTimeout(retryTimer);
  clearInterval(periodicTimer);
  emitStatus('idle', 'Signed out');
}
