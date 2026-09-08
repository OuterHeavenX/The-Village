// The one seam between game.js and the 3D battlefield.
//
// game.js owns the simulation and the 2D canvas; this object owns the WebGL
// context's lifetime. It is mounted when a keep-layout battle starts and
// disposed when the battle screen closes, so the battlefield never holds a
// context while the Village's own renderer is on screen. While the GLB is
// still loading, or if the context is lost, `active` is false and game.js
// keeps drawing the 2D board — the 3D view is an overlay that can always be
// taken away.

import { createBattlefieldScene } from './battlefieldScene.js';

let field = null, mounting = null, state = 'idle';

export const battle3d = {
  get mounted() { return !!field; },
  get active() { return !!field && state === 'ready' && !field.lost; },
  get state() { return state; },

  mount(hostCanvas) {
    if (field || mounting) return mounting || Promise.resolve(this.active);
    try {
      field = createBattlefieldScene({ host: hostCanvas, onContextLost: () => { state = 'lost'; console.warn('[Battle3D] WebGL context lost; the 2D board takes over'); } });
    } catch (error) {
      console.warn('[Battle3D] WebGL unavailable; the 2D board takes over', error);
      field = null;
      return Promise.resolve(false);
    }
    state = 'loading';
    document.body.classList.add('battle-3d');
    mounting = field.ready.then(() => {
      if (!field) return false;
      state = 'ready';
      field.resize();
      return true;
    }).catch(error => {
      console.warn('[Battle3D] battlefield failed to load; the 2D board takes over', error);
      this.unmount();
      return false;
    }).finally(() => { mounting = null; });
    return mounting;
  },

  unmount() {
    if (!field) return;
    try { field.dispose(); } catch (error) { console.warn('[Battle3D] dispose failed', error); }
    field = null;
    state = 'idle';
    document.body.classList.remove('battle-3d');
  },

  render(view) { if (this.active) field.render(view); },
  resize() { field?.resize(); },
  worldAt(clientX, clientY) { return this.active ? field.worldAt(clientX, clientY) : null; },
  project(x, y, h) { return this.active ? field.project(x, y, h) : { x: 0, y: 0, visible: false }; },
  stats() { return field ? { state, quality: field.quality.tier, ...field.stats() } : { state }; }
};
