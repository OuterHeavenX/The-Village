import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COMPANION_REGISTRY,
  EQUIPMENT_REGISTRY,
  GEM_REGISTRY
} from '../src/Ascension/registry.js';
import { RELEASE_VERSION } from '../src/config/release.js';
import { runtimePublicAssets, viteManagedAssets } from './runtime-assets.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');
const failures = [];

async function requireFile(relative) {
  const target = path.join(distRoot, relative);
  try {
    if (!(await stat(target)).isFile()) failures.push(`Not a file: dist/${relative}`);
  } catch {
    failures.push(`Missing: dist/${relative}`);
  }
}

for (const relative of runtimePublicAssets()) await requireFile(relative);

const distAssetNames = await readdir(path.join(distRoot, 'assets'));
for (const source of viteManagedAssets) {
  const extension = path.extname(source);
  const stem = path.basename(source, extension).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!distAssetNames.some(name => name.startsWith(`${stem}-`) && name.endsWith(extension))) {
    failures.push(`Vite-managed asset was not emitted for ${source}`);
  }
}

for (const [name, registry] of [
  ['equipment', EQUIPMENT_REGISTRY],
  ['gems', GEM_REGISTRY],
  ['companions', COMPANION_REGISTRY]
]) {
  if (!registry.length) failures.push(`${name} registry is empty`);
  for (const item of registry) {
    if (!item.id || !item.name || !item.icon) failures.push(`${name} registry item is missing id, name, or icon`);
    if (typeof item.icon === 'string' && /(?:^|\/)assets\//.test(item.icon)) {
      await requireFile(item.icon.replace(/^\/+/, ''));
    }
  }
}

const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));
const releaseSource = await readFile(path.join(projectRoot, 'src', 'config', 'release.js'), 'utf8');
const indexHtml = await readFile(path.join(projectRoot, 'index.html'), 'utf8');
const cloudSource = await readFile(path.join(projectRoot, 'src', 'online', 'cloudSave.js'), 'utf8');
if (packageJson.version !== RELEASE_VERSION) failures.push(`package.json is ${packageJson.version}, expected ${RELEASE_VERSION}`);
if (!releaseSource.includes(`RELEASE_VERSION = '${RELEASE_VERSION}'`)) failures.push('Release source does not contain the expected version');
if (/35\.0\.0|V35\.0(?:\D|$)/.test(indexHtml)) failures.push('index.html still contains a V35.0 visible version');
if (!cloudSource.includes("GAME_VERSION = RELEASE_VERSION")) failures.push('Cloud saves do not consume the shared release version');

if (failures.length) {
  console.error(`Production validation failed:\n${failures.map(item => `- ${item}`).join('\n')}`);
  process.exit(1);
}

console.log(`Production validation passed: ${runtimePublicAssets().length} dynamic assets, ${viteManagedAssets.length} bundled assets, and all progression registries are complete.`);
