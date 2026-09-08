import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// The Village ships as a static bundle. Until now there was no config at all,
// so Vite used its default base of '/' and dist/index.html referenced
// /assets/index-*.js. That works on a root domain (Cloudflare Pages, a custom
// domain) and 404s on every path-prefixed host — most importantly a GitHub
// Pages project site served from /<repo>/.
//
// A relative base makes the bundle host-agnostic: the same dist/ works from a
// root domain, a subdirectory, or a local `file:`-style static server. The
// game's own runtime asset paths ('assets/...') were already document-relative,
// so this brings the generated references in line with them.
//
// VITE_BASE overrides it if a deployment ever needs an absolute prefix.
const base = process.env.VITE_BASE || './';

// Every build carries the commit it was made from, so a deployed page can say
// which build it is (the Village footer shows it). GitHub Actions and
// Cloudflare Pages expose the commit; a local build falls back to git, then
// to 'local'.
function buildStamp() {
  let sha = process.env.GITHUB_SHA || process.env.CF_PAGES_COMMIT_SHA || '';
  if (!sha) {
    try { sha = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { sha = 'local'; }
  }
  return `${sha.slice(0, 7)} · ${new Date().toISOString().slice(0, 10)}`;
}

export default defineConfig({
  base,
  define: { __BUILD_STAMP__: JSON.stringify(buildStamp()) },
  server: { host: '0.0.0.0' },
  preview: { host: '0.0.0.0' },
  build: {
    outDir: 'dist',
    // three.module.js alone is over 500 kB. The warning is noise on a project
    // that deliberately ships one large vendor chunk.
    chunkSizeWarningLimit: 900
  }
});
