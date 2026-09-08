export const RELEASE_VERSION = '37.0.0';
export const RELEASE_NAME = 'SIEGE OF THE KEEP';
// Commit and date of this build, injected by vite.config.js; 'dev' under the dev server.
export const BUILD_STAMP = typeof __BUILD_STAMP__ === 'string' ? __BUILD_STAMP__ : 'dev';
export const RELEASE_LABEL = `V${RELEASE_VERSION} — ${RELEASE_NAME}`;

export function applyReleaseMetadata(root = document) {
  root.querySelectorAll('[data-release-version]').forEach(element => {
    element.textContent = element.dataset.releasePrefix
      ? `${element.dataset.releasePrefix}${RELEASE_VERSION}`
      : RELEASE_VERSION;
  });
  root.querySelectorAll('[data-release-label]').forEach(element => {
    element.textContent = RELEASE_LABEL;
  });
  root.querySelectorAll('[data-build-stamp]').forEach(element => {
    element.textContent = `build ${BUILD_STAMP}`;
  });
  document.documentElement.dataset.gameVersion = RELEASE_VERSION;
  document.documentElement.dataset.buildStamp = BUILD_STAMP;
  console.info(`[The Village] V${RELEASE_VERSION} ${RELEASE_NAME} · build ${BUILD_STAMP}`);
}
