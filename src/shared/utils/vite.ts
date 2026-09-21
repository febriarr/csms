import fs from 'node:fs';
import path from 'node:path';

type ViteManifestEntry = {
  file: string;
  css?: string[];
  imports?: string[];
};

type ViteManifest = Record<string, ViteManifestEntry>;

const manifestPath = path.resolve(process.cwd(), 'dist/client/.vite/manifest.json');

let manifest: ViteManifest | undefined;

function loadManifest(): ViteManifest {
  if (manifest) {
    return manifest;
  }

  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ViteManifest;

  return manifest;
}

export function getViteAssets() {
  const manifest = loadManifest();

  const entry = manifest['src/client/main.ts'];

  if (!entry) {
    throw new Error('Vite entry "src/client/main.ts" not found in manifest');
  }

  return {
    js: `/client/${entry.file}`,
    css: entry.css?.map(file => `/client/${file}`) ?? [],
  };
}
