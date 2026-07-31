import { supabase, supabaseConfigurationError } from './supabaseClient.js';
import {
  clearCloudRuntime,
  flushCloudSave,
  getActiveAccount,
  getCloudStatus,
  initializeCloudForSession,
  queueCloudSave,
  setCloudOfflineStatus,
  startCloudAutosave
} from './cloudSave.js';
import { logStartupFailure, logStartupStage, withTimeout } from './startupWatchdog.js';

let startGameCallback = null;
let entryPromise = null;
let activeUserId = '';
let gameStarted = false;
let recoveryMode = false;
let setupRetryTimer = 0;

const $ = selector => document.querySelector(selector);

function setAuthFeedback(message = '', kind = '') {
  const element = $('#authFeedback');
  if (!element) return;
  element.textContent = message;
  element.dataset.kind = kind;
  element.classList.toggle('hidden', !message);
}

function readableError(error) {
  const message = String(error?.message || error || 'Something went wrong.');
  if (/invalid login credentials/i.test(message)) return 'The email or password is incorrect.';
  if (/email not confirmed/i.test(message)) return 'Confirm your email before signing in.';
  if (/already registered|already been registered|user already exists/i.test(message)) return 'An account already exists for this email.';
  if (/password/i.test(message) && /least|short|characters/i.test(message)) return 'Password must contain at least eight characters.';
  if (/failed to fetch|network|load failed/i.test(message)) return 'The network is unavailable. Check your connection and try again.';
  if (/relation .* does not exist|schema cache/i.test(message)) return 'Cloud tables are not ready. Apply the Supabase migration, then retry.';
  if (/row-level security|permission denied|policy/i.test(message)) return 'Cloud access is not configured correctly. Verify the migration and RLS policies.';
  return message.replace(/https?:\/\/\S+/g, '').slice(0, 220);
}

function isMissingCloudSchema(error) {
  const message = String(error?.message || error || '');
  return /relation .* does not exist|schema cache|could not find the table|PGRST205|42P01/i.test(message);
}

function clearSetupRetry() {
  clearTimeout(setupRetryTimer);
  setupRetryTimer = 0;
  $('#authSetupHelp')?.classList.add('hidden');
}

function showStartupFailure(error, session = null) {
  revealAuth();
  showView('failure');
  const missingSchema = isMissingCloudSchema(error);
  $('#authFailureText').textContent = missingSchema
    ? 'The account connection works, but the cloud-save tables have not been created yet.'
    : readableError(error);
  $('#authSetupHelp')?.classList.toggle('hidden', !missingSchema);
  $('#authRetry')?.classList.remove('hidden');
  if (missingSchema && session) {
    clearTimeout(setupRetryTimer);
    setupRetryTimer = window.setTimeout(() => enterGame(session), 5000);
  }
}

function showView(view) {
  document.querySelectorAll('[data-auth-view]').forEach(panel => panel.classList.toggle('hidden', panel.dataset.authView !== view));
  setAuthFeedback();
  const title = { login: 'Enter The Village', signup: 'Create Tester Account', forgot: 'Recover Your Chronicle', reset: 'Choose a New Password', loading: 'Awakening the Chronicle', failure: 'The Road Is Obscured' };
  $('#authTitle').textContent = title[view] || 'The Village';
}

function setBusy(form, busy, label = '') {
  if (!form) return;
  form.dataset.busy = busy ? 'true' : 'false';
  form.querySelectorAll('button,input').forEach(control => control.disabled = busy);
  const submit = form.querySelector('[type="submit"]');
  if (submit) {
    if (!submit.dataset.label) submit.dataset.label = submit.textContent;
    submit.textContent = busy ? (label || 'Please wait…') : submit.dataset.label;
  }
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function revealAuth() {
  document.documentElement.classList.remove('auth-pending', 'auth-ready');
  document.documentElement.classList.add('auth-required');
  $('#authGate')?.classList.remove('hidden');
}

function revealGame() {
  $('#authGate')?.classList.add('hidden');
  document.documentElement.classList.remove('auth-pending', 'auth-required');
  document.documentElement.classList.add('auth-ready');
  updateAccountPanel();
}

function hideSplash(destination = 'login') {
  logStartupStage('Hide splash', destination);
  if (destination === 'game') {
    revealGame();
    return;
  }
  revealAuth();
  showView(destination);
}

function setLoading(message) {
  revealAuth();
  showView('loading');
  $('#authLoadingText').textContent = message;
}

function updateAccountPanel() {
  const account = getActiveAccount();
  const cloud = getCloudStatus();
  if ($('#accountDisplayName')) $('#accountDisplayName').textContent = account?.displayName || '—';
  if ($('#accountEmail')) $('#accountEmail').textContent = account?.email || '—';
  if ($('#accountCloudStatus')) $('#accountCloudStatus').textContent = cloud.message;
  if ($('#accountLastSync')) {
    $('#accountLastSync').textContent = cloud.lastSuccessfulSync
      ? new Date(cloud.lastSuccessfulSync).toLocaleString()
      : 'Not synced yet';
  }
  const indicator = $('#cloudSaveIndicator');
  if (indicator) {
    indicator.textContent = cloud.message;
    indicator.dataset.state = cloud.state;
    indicator.classList.toggle('hidden', cloud.state === 'idle');
  }
}

async function enterGame(session, displayName = '') {
  if (!session?.user || recoveryMode) return;
  if (activeUserId === session.user.id && gameStarted) return;
  if (entryPromise) return entryPromise;
  entryPromise = (async () => {
    try {
      clearSetupRetry();
      setLoading('Loading player profile…');
      logStartupStage('Cloud save bootstrap');
      const result = await withTimeout(
        initializeCloudForSession(session, displayName),
        'Cloud save bootstrap'
      );
      logStartupStage('Database readiness', result.mode);
      setLoading(result.mode === 'migrated-local' ? 'Migrating local progress…' : 'Loading cloud save…');
      if (!gameStarted) {
        logStartupStage('UI initialization');
        await withTimeout(startGameCallback(), 'UI initialization', 30000);
        gameStarted = true;
      }
      activeUserId = session.user.id;
      startCloudAutosave();
      if (result.mode === 'new') {
        queueCloudSave('new-account');
        await withTimeout(flushCloudSave('new-account'), 'Initial cloud save');
      }
      setLoading('Entering The Village…');
      hideSplash('game');
      logStartupStage('Show login or resume session', 'session resumed');
    } catch (error) {
      logStartupFailure('Authenticated startup', error);
      setCloudOfflineStatus('Offline — cloud unavailable');
      try {
        if (!gameStarted) {
          setLoading('Cloud unavailable — entering offline mode…');
          logStartupStage('UI initialization', 'offline fallback');
          await withTimeout(startGameCallback(), 'Offline UI initialization', 30000);
          gameStarted = true;
        }
        activeUserId = session.user.id;
        hideSplash('game');
        logStartupStage('Show login or resume session', 'offline session');
      } catch (uiError) {
        logStartupFailure('Offline UI initialization', uiError);
        showStartupFailure(uiError);
        hideSplash('failure');
      }
    } finally {
      entryPromise = null;
    }
  })();
  return entryPromise;
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.busy === 'true') return;
  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;
  if (!validEmail(email)) return setAuthFeedback('Enter a valid email address.', 'error');
  if (!password) return setAuthFeedback('Enter your password.', 'error');
  setBusy(form, true, 'Signing in…');
  setAuthFeedback('Signing in…', 'info');
  try {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      'Sign in'
    );
    if (error) throw error;
    await withTimeout(enterGame(data.session), 'Authenticated game entry', 40000);
  } catch (error) {
    setAuthFeedback(readableError(error), 'error');
  } finally {
    setBusy(form, false);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.busy === 'true') return;
  const displayName = $('#signupDisplayName').value.trim();
  const email = $('#signupEmail').value.trim();
  const password = $('#signupPassword').value;
  const confirmation = $('#signupConfirmPassword').value;
  if (!displayName) return setAuthFeedback('Display name is required.', 'error');
  if (displayName.length > 40) return setAuthFeedback('Display name must be 40 characters or fewer.', 'error');
  if (!validEmail(email)) return setAuthFeedback('Enter a valid email address.', 'error');
  if (password.length < 8) return setAuthFeedback('Password must contain at least eight characters.', 'error');
  if (password !== confirmation) return setAuthFeedback('Passwords do not match.', 'error');
  setBusy(form, true, 'Creating account…');
  setAuthFeedback('Creating your chronicle…', 'info');
  try {
    const { data, error } = await withTimeout(supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${location.origin}${location.pathname}`
      }
    }), 'Account creation');
    if (error) throw error;
    if (!data.session) {
      showView('login');
      setAuthFeedback('Account created. Confirm the email Supabase sent you, then sign in.', 'success');
      $('#loginEmail').value = email;
      return;
    }
    await withTimeout(enterGame(data.session, displayName), 'New account game entry', 40000);
  } catch (error) {
    setAuthFeedback(readableError(error), 'error');
  } finally {
    setBusy(form, false);
  }
}

async function handleForgot(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.busy === 'true') return;
  const email = $('#forgotEmail').value.trim();
  if (!validEmail(email)) return setAuthFeedback('Enter a valid email address.', 'error');
  setBusy(form, true, 'Sending link…');
  try {
    const { error } = await withTimeout(supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}${location.pathname}`
    }), 'Password reset request');
    if (error) throw error;
    setAuthFeedback('Reset link sent. Check your email and return through that link.', 'success');
  } catch (error) {
    setAuthFeedback(readableError(error), 'error');
  } finally {
    setBusy(form, false);
  }
}

async function handlePasswordReset(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.busy === 'true') return;
  const password = $('#resetPassword').value;
  const confirmation = $('#resetConfirmPassword').value;
  if (password.length < 8) return setAuthFeedback('Password must contain at least eight characters.', 'error');
  if (password !== confirmation) return setAuthFeedback('Passwords do not match.', 'error');
  setBusy(form, true, 'Updating password…');
  try {
    const { error } = await withTimeout(supabase.auth.updateUser({ password }), 'Password update');
    if (error) throw error;
    recoveryMode = false;
    setAuthFeedback('Password updated. Your chronicle is ready.', 'success');
    const { data } = await withTimeout(supabase.auth.getSession(), 'Session restoration after password update');
    await withTimeout(enterGame(data.session), 'Game entry after password update', 40000);
  } catch (error) {
    setAuthFeedback(readableError(error), 'error');
  } finally {
    setBusy(form, false);
  }
}

export async function logoutCurrentAccount() {
  const button = $('#accountLogout');
  if (button) button.disabled = true;
  try {
    queueCloudSave('logout');
    await withTimeout(Promise.race([
      flushCloudSave('logout'),
      new Promise(resolve => setTimeout(resolve, 4000))
    ]), 'Logout cloud flush', 5000);
    const { error } = await withTimeout(supabase.auth.signOut(), 'Sign out');
    if (error) throw error;
    clearCloudRuntime();
    location.reload();
  } catch (error) {
    if (button) button.disabled = false;
    const statusElement = $('#accountCloudStatus');
    if (statusElement) statusElement.textContent = readableError(error);
  }
}

function bindAuthUI() {
  $('#loginForm')?.addEventListener('submit', handleLogin);
  $('#signupForm')?.addEventListener('submit', handleSignup);
  $('#forgotForm')?.addEventListener('submit', handleForgot);
  $('#resetPasswordForm')?.addEventListener('submit', handlePasswordReset);
  $('#showSignup')?.addEventListener('click', () => showView('signup'));
  $('#showForgot')?.addEventListener('click', () => {
    $('#forgotEmail').value = $('#loginEmail').value.trim();
    showView('forgot');
  });
  document.querySelectorAll('[data-auth-return]').forEach(button => button.addEventListener('click', () => showView('login')));
  document.querySelectorAll('[data-password-toggle]').forEach(button => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    button.textContent = input.type === 'password' ? 'Show' : 'Hide';
    button.setAttribute('aria-pressed', String(input.type !== 'password'));
  }));
  $('#authRetry')?.addEventListener('click', async () => {
    try {
      clearSetupRetry();
      setLoading('Checking cloud database…');
      const { data, error } = await withTimeout(supabase.auth.getSession(), 'Session retry');
      if (error) showStartupFailure(error);
      else if (!data.session) showView('login');
      else await enterGame(data.session).catch(error => {
        logStartupFailure('Session retry', error);
        hideSplash('login');
        setAuthFeedback(readableError(error), 'error');
      });
    } catch (error) {
      logStartupFailure('Session retry', error);
      hideSplash('login');
      setAuthFeedback(readableError(error), 'error');
    }
  });
  $('#accountLogout')?.addEventListener('click', logoutCurrentAccount);
  window.addEventListener('village-cloud-status', updateAccountPanel);
}

export async function bootstrapAuthentication(startGame) {
  logStartupStage('App boot');
  startGameCallback = startGame;
  bindAuthUI();
  revealAuth();
  if (supabaseConfigurationError || !supabase) {
    hideSplash('login');
    setAuthFeedback(`${supabaseConfigurationError} Online sign-in is unavailable until configuration is restored.`, 'error');
    return;
  }

  logStartupStage('Auth listener registration');
  try {
    supabase.auth.onAuthStateChange((event, session) => {
      logStartupStage('Auth state changed', event);
      if (event === 'PASSWORD_RECOVERY') {
        recoveryMode = true;
        revealAuth();
        showView('reset');
        return;
      }
      if (event === 'SIGNED_OUT') {
        activeUserId = '';
        if (!location.href.includes('logout')) {
          revealAuth();
          showView('login');
        }
      }
      if (event === 'SIGNED_IN' && session && !recoveryMode) {
        setTimeout(() => {
          enterGame(session).catch(error => {
            logStartupFailure('Auth listener game entry', error);
            hideSplash('login');
            setAuthFeedback(readableError(error), 'error');
          });
        }, 0);
      }
    });
  } catch (error) {
    logStartupFailure('Auth listener registration', error);
    hideSplash('login');
    setAuthFeedback(`${readableError(error)} Online session updates are unavailable.`, 'error');
    return;
  }

  setLoading('Checking your account…');
  logStartupStage('Session restoration');
  try {
    const { data, error } = await withTimeout(supabase.auth.getSession(), 'Session restoration');
    if (error) throw error;
    if (data.session && !recoveryMode) {
      await withTimeout(enterGame(data.session), 'Authenticated startup', 40000);
    } else if (!recoveryMode) {
      hideSplash('login');
      logStartupStage('Show login or resume session', 'login');
    }
  } catch (error) {
    logStartupFailure('Session restoration', error);
    hideSplash('login');
    setAuthFeedback(`${readableError(error)} You may retry signing in when the service is available.`, 'error');
  }
}
