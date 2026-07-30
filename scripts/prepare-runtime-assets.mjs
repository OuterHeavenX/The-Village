import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimePublicAssets, viteManagedAssets } from './runtime-assets.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicAssetsRoot = path.join(projectRoot, 'public', 'assets');
const required = [...runtimePublicAssets(), ...viteManagedAssets];
const missing = [];

for (const relative of required) {
  try {
    const info = await stat(path.join(projectRoot, relative));
    if (!info.isFile()) missing.push(relative);
  } catch {
    missing.push(relative);
  }
}
if (missing.length) {
  throw new Error(`Runtime asset source validation failed:\n${missing.map(file => `- ${file}`).join('\n')}`);
}

await rm(publicAssetsRoot, { recursive: true, force: true });
let copiedBytes = 0;
for (const relative of runtimePublicAssets()) {
  const source = path.join(projectRoot, relative);
  const destination = path.join(projectRoot, 'public', relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination);
  copiedBytes += (await stat(source)).size;
}

console.log(`Prepared ${runtimePublicAssets().length} controlled runtime assets (${(copiedBytes / 1048576).toFixed(1)} MB).`);
