import './villageBootstrap.js?v=3410';
import './Battle/game.js?v=3410';

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
// Give the 3D Village first claim on the GPU, then decide.
setTimeout(startAtmosphere, 1200);
