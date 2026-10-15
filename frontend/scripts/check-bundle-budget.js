// PERF-7: Bundle-Size Budget Automated Gating Script
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distAssetsDir = path.resolve(__dirname, '../dist/assets');

const BUDGETS = {
  MAX_JS_CHUNK_BYTES: 500 * 1024,      // 500 KB uncompressed
  MAX_JS_CHUNK_GZIP: 160 * 1024,       // 160 KB gzipped
  MAX_CSS_BYTES: 50 * 1024,            // 50 KB uncompressed
  MAX_CSS_GZIP: 15 * 1024              // 15 KB gzipped
};

if (!fs.existsSync(distAssetsDir)) {
  console.error('[PERF-7 Budget Error]: dist/assets directory not found. Run "vite build" first.');
  process.exit(1);
}

const files = fs.readdirSync(distAssetsDir);
let hasBudgetViolation = false;

console.log('\n--- PERF-7: Bundle Budget Audit ---');
console.log('Target Budgets: JS Chunk < 500KB (< 160KB gzip) | CSS < 50KB (< 15KB gzip)\n');

files.forEach((file) => {
  const filePath = path.join(distAssetsDir, file);
  const stats = fs.statSync(filePath);
  const content = fs.readFileSync(filePath);
  const gzipBytes = zlib.gzipSync(content).length;

  const sizeKb = (stats.size / 1024).toFixed(2);
  const gzipKb = (gzipBytes / 1024).toFixed(2);

  if (file.endsWith('.js')) {
    const exceedsRaw = stats.size > BUDGETS.MAX_JS_CHUNK_BYTES;
    const exceedsGzip = gzipBytes > BUDGETS.MAX_JS_CHUNK_GZIP;

    if (exceedsRaw || exceedsGzip) {
      console.error(`[FAIL] ${file}: ${sizeKb} KB (gzip: ${gzipKb} KB) - EXCEEDS BUDGET!`);
      hasBudgetViolation = true;
    } else {
      console.log(`[PASS] ${file}: ${sizeKb} KB (gzip: ${gzipKb} KB)`);
    }
  } else if (file.endsWith('.css')) {
    const exceedsRaw = stats.size > BUDGETS.MAX_CSS_BYTES;
    const exceedsGzip = gzipBytes > BUDGETS.MAX_CSS_GZIP;

    if (exceedsRaw || exceedsGzip) {
      console.error(`[FAIL] ${file}: ${sizeKb} KB (gzip: ${gzipKb} KB) - EXCEEDS BUDGET!`);
      hasBudgetViolation = true;
    } else {
      console.log(`[PASS] ${file}: ${sizeKb} KB (gzip: ${gzipKb} KB)`);
    }
  }
});

if (hasBudgetViolation) {
  console.error('\n[PERF-7 FAILED]: One or more bundle chunks exceed size limits.\n');
  process.exit(1);
} else {
  console.log('\n[PERF-7 SUCCESS]: All assets satisfy performance bundle budgets.\n');
  process.exit(0);
}
