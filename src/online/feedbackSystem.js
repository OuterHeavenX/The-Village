import { RELEASE_VERSION } from '../config/release.js';
import { supabase } from './supabaseClient.js';
import { withTimeout } from './startupWatchdog.js';

const ERROR_LIMIT = 20;
const QUEUE_KEY = 'village.feedback.pending';
const TYPES = new Set(['bug', 'suggestion', 'general']);
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const capturedErrors = [];
let initialized = false;
let previousConsoleError = console.error.bind(console);

function redactText(value) {
  return String(value ?? '')
    .replace(/\b(?:bearer\s+)?eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gi, '[REDACTED_TOKEN]')
    .replace(/\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+\b/gi, '[REDACTED_KEY]')
    .replace(/(["']?\b(?:password|passwd|authorization|access[_-]?token|refresh[_-]?token|api[_-]?key|secret)\b["']?\s*[:=]\s*)(?:["'][^"']*["']|[^\s,;}]+)/gi, '$1[REDACTED]')
    .slice(0, 1600);
}

function safeDiagnostic(value) {
  if (value instanceof Error) return redactText(`${value.name}: ${value.message}\n${value.stack || ''}`);
  if (typeof value === 'string') return redactText(value);
  try {
    return redactText(JSON.stringify(value, (key, item) => {
      if (/password|passwd|authorization|token|api.?key|secret/i.test(key)) return '[REDACTED]';
      if (typeof item === 'string') return redactText(item);
      return item;
    }));
  } catch {
    return redactText(value);
  }
}

function captureError(source, values) {
  const message = values.map(safeDiagnostic).filter(Boolean).join(' ').slice(0, 2000);
  if (!message) return;
  capturedErrors.push({ timestamp: new Date().toISOString(), source, message });
  if (capturedErrors.length > ERROR_LIMIT) capturedErrors.splice(0, capturedErrors.length - ERROR_LIMIT);
}

console.error = (...values) => {
  captureError('console.error', values);
  previousConsoleError(...values);
};
window.addEventListener('error', event => captureError('window.error', [event.error || event.message]));
window.addEventListener('unhandledrejection', event => captureError('unhandledrejection', [event.reason]));

function readPrimarySave() {
  try {
    return JSON.parse(localStorage.getItem('relicsEclipseSave') || localStorage.getItem('gateRunnerSave') || '{}');
  } catch {
    return {};
  }
}

function currentChapter() {
  const save = readPrimarySave();
  const selected = save?.campaign?.selected;
  const unlocked = Number(save?.campaign?.unlocked) || 1;
  return selected ? `${selected} (chapter ${unlocked})` : `Chapter ${unlocked}`;
}

function currentScreen() {
  if (document.body.classList.contains('battle-mode')) return 'Battle';
  const visible = [...document.querySelectorAll('.screen')].find(screen => !screen.classList.contains('hidden'));
  if (!visible) return 'Unknown';
  const names = {
    menu: 'Village', campaignScreen: 'Campaign', deckScreen: 'Cards', heroesScreen: 'Hunters',
    relicVaultScreen: 'Relics', moreScreen: 'More / Settings', gameOver: 'Battle Results'
  };
  return names[visible.id] || visible.id || 'Unknown';
}

function deviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.userAgentData?.platform || navigator.platform || 'unknown',
    language: navigator.language,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    touchPoints: navigator.maxTouchPoints || 0,
    online: navigator.onLine
  };
}

function loadQueue() {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(queue) ? queue.slice(-20) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-20)));
}

function queueSubmission(payload) {
  const queue = loadQueue().filter(item => item.client_submission_id !== payload.client_submission_id);
  queue.push(payload);
  saveQueue(queue);
}

async function activeSession() {
  if (!supabase) return null;
  const { data, error } = await withTimeout(supabase.auth.getSession(), 'Feedback session check', 12000);
  if (error) throw error;
  return data.session || null;
}

async function insertSubmission(payload) {
  const { error } = await withTimeout(
    supabase.from('tester_feedback').insert(payload),
    'Feedback submission',
    15000
  );
  if (error && error.code !== '23505') throw error;
}

async function flushQueuedFeedback() {
  if (!navigator.onLine || !supabase) return;
  let session;
  try {
    session = await activeSession();
  } catch {
    return;
  }
  if (!session?.user) return;
  const queue = loadQueue();
  const remaining = [];
  for (const payload of queue) {
    if (payload.user_id !== session.user.id) {
      remaining.push(payload);
      continue;
    }
    try {
      await insertSubmission(payload);
    } catch {
      remaining.push(payload);
    }
  }
  saveQueue(remaining);
}

function feedbackElements() {
  return {
    overlay: document.querySelector('#testerFeedbackModal'),
    form: document.querySelector('#testerFeedbackForm'),
    feedback: document.querySelector('#testerFeedbackStatus'),
    bugFields: document.querySelector('#testerBugFields'),
    submit: document.querySelector('#testerFeedbackSubmit')
  };
}

function setStatus(message = '', kind = '') {
  const { feedback } = feedbackElements();
  if (!feedback) return;
  feedback.textContent = message;
  feedback.dataset.kind = kind;
  feedback.classList.toggle('hidden', !message);
}

function selectType(type) {
  const normalized = TYPES.has(type) ? type : 'general';
  document.querySelector('#testerSubmissionType').value = normalized;
  document.querySelectorAll('[data-feedback-type]').forEach(button => {
    button.classList.toggle('active', button.dataset.feedbackType === normalized);
  });
  feedbackElements().bugFields?.classList.toggle('hidden', normalized !== 'bug');
}

function refreshContext() {
  document.querySelector('#testerGameVersion').value = RELEASE_VERSION;
  document.querySelector('#testerCurrentChapter').value = currentChapter();
  document.querySelector('#testerCurrentScreen').value = currentScreen();
  document.querySelector('#testerDeviceInfo').value = `${deviceInfo().platform} · ${navigator.userAgent}`;
  document.querySelector('#testerTimestamp').value = new Date().toISOString();
  document.querySelector('#testerAccountId').value = 'Checking authenticated account…';
  document.querySelector('#testerErrorCount').textContent = `${capturedErrors.length} recent client error${capturedErrors.length === 1 ? '' : 's'} will be attached.`;
  activeSession().then(session => {
    const field = document.querySelector('#testerAccountId');
    if (field) field.value = session?.user?.id || 'Sign in required';
  }).catch(() => {
    const field = document.querySelector('#testerAccountId');
    if (field) field.value = 'Account unavailable';
  });
}

function openFeedback(type = 'general') {
  const { overlay } = feedbackElements();
  if (!overlay) return;
  selectType(type);
  refreshContext();
  setStatus();
  overlay.classList.remove('hidden');
  document.body.classList.add('tester-feedback-open');
  document.querySelector('#testerFeedbackTitle')?.focus();
}

function closeFeedback() {
  feedbackElements().overlay?.classList.add('hidden');
  document.body.classList.remove('tester-feedback-open');
}

function setSubmitting(busy) {
  const { form, submit } = feedbackElements();
  form?.querySelectorAll('button,input,textarea,select').forEach(control => control.disabled = busy);
  if (submit) submit.textContent = busy ? 'Sending to the Keep…' : 'Submit Feedback';
}

function makeSubmissionId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.random() * 16 | 0;
    return (character === 'x' ? random : (random & 3 | 8)).toString(16);
  });
}

async function submitFeedback(event) {
  event.preventDefault();
  const { form } = feedbackElements();
  if (form.dataset.busy === 'true') return;
  const type = document.querySelector('#testerSubmissionType').value;
  const title = document.querySelector('#testerFeedbackTitle').value.trim();
  const description = document.querySelector('#testerFeedbackDescription').value.trim();
  const contactEmail = document.querySelector('#testerContactEmail').value.trim();
  if (!TYPES.has(type) || !title || !description) return setStatus('Choose a type and provide both a title and detailed description.', 'error');
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return setStatus('Enter a valid contact email or leave it blank.', 'error');
  if (type === 'bug') {
    const required = ['testerSteps', 'testerExpected', 'testerActual'];
    if (required.some(id => !document.getElementById(id).value.trim())) return setStatus('Bug reports require reproduction steps, expected result, and actual result.', 'error');
  }

  setSubmitting(true);
  setStatus('Preparing your chronicle…', 'info');
  let session = null;
  try {
    session = await activeSession();
  } catch (error) {
    setStatus(`Account verification failed: ${redactText(error.message)}. Please retry when online.`, 'error');
    setSubmitting(false);
    return;
  }
  if (!session?.user) {
    setStatus('Sign in before submitting tester feedback.', 'error');
    setSubmitting(false);
    return;
  }

  const submittedAt = new Date().toISOString();
  const payload = {
    client_submission_id: makeSubmissionId(),
    user_id: session.user.id,
    submission_type: type,
    title: title.slice(0, 140),
    description: description.slice(0, 8000),
    game_version: RELEASE_VERSION,
    current_chapter: currentChapter().slice(0, 120),
    current_screen: currentScreen().slice(0, 120),
    device_info: deviceInfo(),
    contact_email: contactEmail ? contactEmail.slice(0, 254) : null,
    client_submitted_at: submittedAt,
    steps_to_reproduce: type === 'bug' ? document.querySelector('#testerSteps').value.trim().slice(0, 8000) : null,
    expected_result: type === 'bug' ? document.querySelector('#testerExpected').value.trim().slice(0, 4000) : null,
    actual_result: type === 'bug' ? document.querySelector('#testerActual').value.trim().slice(0, 4000) : null,
    severity: type === 'bug' && SEVERITIES.has(document.querySelector('#testerSeverity').value) ? document.querySelector('#testerSeverity').value : null,
    client_errors: capturedErrors.slice(-ERROR_LIMIT)
  };

  try {
    if (!navigator.onLine) throw new Error('offline');
    await insertSubmission(payload);
    form.reset();
    selectType('general');
    setStatus('Thank you. Your feedback has reached the Keep.', 'success');
  } catch (error) {
    queueSubmission(payload);
    setStatus('Saved safely on this device. It will be submitted automatically when the connection returns.', 'offline');
    previousConsoleError('[Tester Feedback] Submission queued:', redactText(error?.message || error));
  } finally {
    setSubmitting(false);
  }
}

export function initializeFeedbackSystem() {
  if (initialized) return;
  initialized = true;
  document.querySelectorAll('[data-feedback-open]').forEach(button => button.addEventListener('click', () => {
    openFeedback(button.dataset.feedbackOpen || 'general');
  }));
  document.querySelectorAll('[data-feedback-type]').forEach(button => button.addEventListener('click', () => selectType(button.dataset.feedbackType)));
  document.querySelector('#testerFeedbackClose')?.addEventListener('click', closeFeedback);
  document.querySelector('#testerFeedbackCancel')?.addEventListener('click', closeFeedback);
  document.querySelector('#testerFeedbackModal')?.addEventListener('click', event => {
    if (event.target.id === 'testerFeedbackModal') closeFeedback();
  });
  document.querySelector('#testerFeedbackForm')?.addEventListener('submit', submitFeedback);
  document.querySelector('#battlePauseResume')?.addEventListener('click', () => document.querySelector('#pauseBtn')?.click());
  document.querySelector('#pauseBtn')?.addEventListener('click', () => setTimeout(() => {
    const paused = window.VillageBattleAPI?.state?.().paused ?? document.querySelector('#pauseBtn')?.dataset.paused === 'true';
    document.querySelector('#battlePausePanel')?.classList.toggle('hidden', !paused);
  }));
  window.addEventListener('online', flushQueuedFeedback);
  flushQueuedFeedback();
}
