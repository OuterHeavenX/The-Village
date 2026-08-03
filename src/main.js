import { bootstrapAuthentication } from './online/authGate.js';
import { applyReleaseMetadata } from './config/release.js';
import { initializeFeedbackSystem } from './online/feedbackSystem.js';
import { logStartupFailure, logStartupStage, withTimeout } from './online/startupWatchdog.js';
import './UI/villageProductionUI.css';
import './UI/battle3.css';
import './UI/cards2.css';
import { initializeVillageProductionUI } from './UI/villageProductionUI.js';

applyReleaseMetadata();
initializeFeedbackSystem();
initializeVillageProductionUI();
logStartupStage('App boot', 'main module loaded');

// V32.6.2 — the decorative atmosphere layer is now conditional.
//
// It opens a *second* WebGL context on top of the one the 3D Village needs.
// iOS Safari enforces a browser-wide context budget, so on an iPad with a few
// tabs open the second request is exactly what fails — and the layer is not
// even visible any more: #villageThreeCanvas paints over it in the Village and
// `body.battle-mode #threeBg` hides it during a hunt. It is kept for desktop,
// where contexts are cheap and it still shows through the 2D fallback Village.
const MOBILE_GPU = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
                   (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
function startAtmosphere(){
  if (MOBILE_GPU) return;
  if (document.body.classList.contains('village-three-active')) return;
  import('./Renderer/threeAtmosphere.js?v=3410').catch(err => {
    console.warn('Atmosphere layer unavailable; continuing without it.', err?.message || err);
  });
}
bootstrapAuthentication(async () => {
  // Village ownership must still be established before the battle module loads.
  await withTimeout(import('./villageBootstrap.js?v=3410'), 'Village module import');
  await withTimeout(import('./Battle/game.js?v=3410'), 'Battle module import');
  // Give the 3D Village first claim on the GPU, then decide.
  setTimeout(startAtmosphere, 1200);
}).catch(error => {
  logStartupFailure('Application bootstrap', error);
  document.documentElement.classList.remove('auth-pending', 'auth-ready');
  document.documentElement.classList.add('auth-required');
  document.querySelector('#authGate')?.classList.remove('hidden');
  document.querySelectorAll('[data-auth-view]').forEach(panel => {
    panel.classList.toggle('hidden', panel.dataset.authView !== 'login');
  });
  const feedback = document.querySelector('#authFeedback');
  if (feedback) {
    feedback.textContent = 'Startup could not complete. Online services are unavailable; reload to retry.';
    feedback.dataset.kind = 'error';
    feedback.classList.remove('hidden');
  }
});
