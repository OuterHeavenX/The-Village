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
const distIndexHtml = await readFile(path.join(distRoot, 'index.html'), 'utf8');
const cloudSource = await readFile(path.join(projectRoot, 'src', 'online', 'cloudSave.js'), 'utf8');
const feedbackMigration = await readFile(path.join(projectRoot, 'supabase', 'migrations', '002_tester_feedback.sql'), 'utf8');
if (packageJson.version !== RELEASE_VERSION) failures.push(`package.json is ${packageJson.version}, expected ${RELEASE_VERSION}`);
if (!releaseSource.includes(`RELEASE_VERSION = '${RELEASE_VERSION}'`)) failures.push('Release source does not contain the expected version');
if (/35\.0\.0|V35\.0(?:\D|$)/.test(indexHtml)) failures.push('index.html still contains a V35.0 visible version');
if (!cloudSource.includes("GAME_VERSION = RELEASE_VERSION")) failures.push('Cloud saves do not consume the shared release version');
for (const required of [
  'alter table public.tester_feedback enable row level security',
  'grant insert on table public.tester_feedback to authenticated',
  'with check ((select auth.uid()) = user_id)'
]) {
  if (!feedbackMigration.toLowerCase().includes(required)) failures.push(`Tester feedback migration is missing: ${required}`);
}
if (/for\s+(select|update|delete)\s+to\s+authenticated/i.test(feedbackMigration)) {
  failures.push('Tester feedback migration grants authenticated clients read or mutation policies');
}

// A static host must publish dist/, never the repository root. The source index
// intentionally points to /src/main.js for Vite development; Vite must replace
// that entry with a hashed assets/ bundle in production.
if (/(?:src|href)=["'][^"']*\/src\//i.test(distIndexHtml)) {
  failures.push('dist/index.html exposes a raw /src/ reference instead of a Vite bundle');
}
// vite.config.js builds with a relative base so the same dist/ works from a
// root domain and from a path prefix such as a GitHub Pages project site.
// Accept both './assets/...' and the absolute form an explicit VITE_BASE
// produces, and reject anything that escapes assets/ either way.
const stripBase = source => source.replace(/^\.?\/+/, '');
const productionScripts = [...distIndexHtml.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
  .map(match => match[1]);
const bundledEntries = productionScripts.filter(source => /^assets\/index-[A-Za-z0-9_-]+\.js$/.test(stripBase(source)));
if (bundledEntries.length !== 1) {
  failures.push(`dist/index.html must reference exactly one hashed Vite entry under assets/; found: ${productionScripts.join(', ') || 'none'}`);
}
for (const source of productionScripts) {
  if (/^[a-z]+:/i.test(source)) {
    failures.push(`Unexpected absolute production script URL: ${source}`);
    continue;
  }
  const relative = stripBase(source);
  if (!relative.startsWith('assets/')) {
    failures.push(`Unexpected production script outside assets/: ${source}`);
    continue;
  }
  await requireFile(relative);
}
// Relative references are what make the default bundle host-agnostic; a
// root-absolute stylesheet or script would 404 under a path prefix. Skip this
// when VITE_BASE was set deliberately, since choosing an absolute base is an
// explicit decision to pin the deployment to one path.
if (!process.env.VITE_BASE) {
  for (const [, attribute, value] of distIndexHtml.matchAll(/\b(src|href)=["'](\/[^"'/][^"']*)["']/gi)) {
    failures.push(`dist/index.html uses a root-absolute ${attribute} (${value}); it will 404 under a path prefix`);
  }
}
for (const assetName of distAssetNames.filter(name => name.endsWith('.js'))) {
  const emittedSource = await readFile(path.join(distRoot, 'assets', assetName), 'utf8');
  if (/(?:\bfrom\s*|\bimport\s*\()\s*["']@supabase\/supabase-js["']/.test(emittedSource)) {
    failures.push(`Bare @supabase/supabase-js import remains in dist/assets/${assetName}`);
  }
}

if (failures.length) {
  console.error(`Production validation failed:\n${failures.map(item => `- ${item}`).join('\n')}`);
  process.exit(1);
}

console.log(`Production validation passed: ${runtimePublicAssets().length} dynamic assets, ${viteManagedAssets.length} bundled assets, and all progression registries are complete.`);
