import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const docsDir = path.resolve(rootDir, 'docs');
const assetsDir = path.resolve(rootDir, 'assets');

console.log('[sync-gh-pages] Synchronizing production build for GitHub Pages...');

if (!fs.existsSync(distDir)) {
  console.error('[sync-gh-pages] Error: dist/ does not exist. Run vite build first.');
  process.exit(1);
}

// 1. Copy dist/index.html to root index.html
fs.copyFileSync(path.resolve(distDir, 'index.html'), path.resolve(rootDir, 'index.html'));
console.log('✓ Copied dist/index.html -> root index.html');

// 2. Ensure root assets directory exists and copy dist/assets/* into it
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
const distAssets = fs.readdirSync(path.resolve(distDir, 'assets'));
for (const file of distAssets) {
  fs.copyFileSync(path.resolve(distDir, 'assets', file), path.resolve(assetsDir, file));
}
console.log(`✓ Copied ${distAssets.length} asset(s) -> root assets/`);

// 3. Ensure docs/ directory exists and copy all dist/* into docs/ (for GitHub Pages /docs folder deployment option)
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}
fs.cpSync(distDir, docsDir, { recursive: true });
console.log('✓ Synchronized dist/ -> docs/ for GitHub Pages /docs option');

// 4. Create .nojekyll in root and docs to prevent Jekyll from skipping files
fs.writeFileSync(path.resolve(rootDir, '.nojekyll'), '');
fs.writeFileSync(path.resolve(docsDir, '.nojekyll'), '');
console.log('✓ Created .nojekyll in root and docs/');

console.log('[sync-gh-pages] GitHub Pages multi-target deployment synchronization complete!');
