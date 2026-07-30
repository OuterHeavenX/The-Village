export const RELEASE_VERSION = '35.1.1';
export const RELEASE_NAME = 'VITE NATIVE FOUNDATION';
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
  document.documentElement.dataset.gameVersion = RELEASE_VERSION;
}
