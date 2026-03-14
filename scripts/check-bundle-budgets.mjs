import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const contracts = [
  {
    name: '@openbunny/web',
    distDir: 'packages/web/dist',
    assetsDir: 'packages/web/dist/assets',
    entryPrefix: 'index-',
    maxEntrySizeBytes: 550 * 1024,
    maxInitialJsBytes: 1900 * 1024,
    asyncChunkBudgets: [
      { prefix: 'vendor-shiki-core-', maxSizeBytes: 175 * 1024 },
      { prefix: 'vendor-shiki-lang-', maxSizeBytes: 210 * 1024 },
      { prefix: 'vendor-shiki-theme-', maxSizeBytes: 40 * 1024 },
    ],
  },
  {
    name: '@openbunny/desktop',
    distDir: 'packages/desktop/dist',
    assetsDir: 'packages/desktop/dist/assets',
    entryPrefix: 'index-',
    maxEntrySizeBytes: 550 * 1024,
    maxInitialJsBytes: 1900 * 1024,
    asyncChunkBudgets: [
      { prefix: 'vendor-shiki-core-', maxSizeBytes: 175 * 1024 },
      { prefix: 'vendor-shiki-lang-', maxSizeBytes: 210 * 1024 },
      { prefix: 'vendor-shiki-theme-', maxSizeBytes: 40 * 1024 },
    ],
  },
];

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function collectInitialJsAssets(distDir) {
  const indexHtmlPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    return { missing: [`${indexHtmlPath}`], totalBytes: 0 };
  }

  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const assetRefs = Array.from(
    indexHtml.matchAll(/<(?:script[^>]*type="module"[^>]*src|link[^>]*rel="modulepreload"[^>]*href)="([^"]+\.js)"/g),
    (match) => match[1],
  );

  const missing = [];
  let totalBytes = 0;
  for (const assetRef of assetRefs) {
    const normalizedRef = assetRef.replace(/^\.\//, '').replace(/^\/+/, '');
    const assetPath = path.join(distDir, normalizedRef);
    if (!fs.existsSync(assetPath)) {
      missing.push(assetPath);
      continue;
    }
    totalBytes += fs.statSync(assetPath).size;
  }

  return { missing, totalBytes };
}

const failures = [];
for (const contract of contracts) {
  const assetsDir = path.join(repoRoot, contract.assetsDir);
  const distDir = path.join(repoRoot, contract.distDir);
  if (!fs.existsSync(assetsDir)) {
    failures.push(`- ${contract.name} is missing build assets at ${contract.assetsDir}`);
    continue;
  }

  const assetFiles = fs.readdirSync(assetsDir);
  const entryFiles = assetFiles.filter((file) => file.startsWith(contract.entryPrefix) && file.endsWith('.js'));

  if (entryFiles.length !== 1) {
    failures.push(`- ${contract.name} expected exactly one ${contract.entryPrefix}*.js entry chunk but found ${entryFiles.length}`);
    continue;
  }

  const entryFile = entryFiles[0];
  const entrySize = fs.statSync(path.join(assetsDir, entryFile)).size;
  if (entrySize > contract.maxEntrySizeBytes) {
    failures.push(
      `- ${contract.name} entry chunk ${entryFile} is ${formatKiB(entrySize)} (limit ${formatKiB(contract.maxEntrySizeBytes)})`,
    );
  }

  const initialJs = collectInitialJsAssets(distDir);
  if (initialJs.missing.length > 0) {
    failures.push(`- ${contract.name} is missing initial JS assets referenced by ${contract.distDir}/index.html`);
  } else if (initialJs.totalBytes > contract.maxInitialJsBytes) {
    failures.push(
      `- ${contract.name} initial JS payload is ${formatKiB(initialJs.totalBytes)} (limit ${formatKiB(contract.maxInitialJsBytes)})`,
    );
  }

  for (const chunkBudget of contract.asyncChunkBudgets) {
    const matchingChunks = assetFiles.filter((file) => file.startsWith(chunkBudget.prefix) && file.endsWith('.js'));
    if (matchingChunks.length === 0) {
      failures.push(`- ${contract.name} is missing async chunk ${chunkBudget.prefix}*.js in ${contract.assetsDir}`);
      continue;
    }

    for (const chunkFile of matchingChunks) {
      const chunkSize = fs.statSync(path.join(assetsDir, chunkFile)).size;
      if (chunkSize > chunkBudget.maxSizeBytes) {
        failures.push(
          `- ${contract.name} async chunk ${chunkFile} is ${formatKiB(chunkSize)} (limit ${formatKiB(chunkBudget.maxSizeBytes)})`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Bundle budget contract violations found:\n');
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

for (const contract of contracts) {
  const assetsDir = path.join(repoRoot, contract.assetsDir);
  const distDir = path.join(repoRoot, contract.distDir);
  const assetFiles = fs.readdirSync(assetsDir);
  const entryFile = assetFiles.find((file) => file.startsWith(contract.entryPrefix) && file.endsWith('.js'));
  const entrySize = fs.statSync(path.join(assetsDir, entryFile)).size;
  const initialJs = collectInitialJsAssets(distDir);
  console.log(
    `${contract.name} bundle budget passed: ${entryFile} = ${formatKiB(entrySize)}, initial JS = ${formatKiB(initialJs.totalBytes)}`,
  );
}
