import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const roots = ['packages', 'worker'];
const packageFiles = {
  '@openbunny/shared': 'packages/shared/package.json',
  '@openbunny/ui-web': 'packages/ui-web/package.json',
};

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'dist' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (exts.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function getPackageExports(pkgName) {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, packageFiles[pkgName]), 'utf8'));
  return Object.keys(pkg.exports || {});
}

function isExported(subpath, exportsMap) {
  if (subpath === '') return exportsMap.includes('.');
  const key = `./${subpath}`;
  if (exportsMap.includes(key)) return true;

  return exportsMap.some((entry) => {
    const starIndex = entry.indexOf('*');
    if (starIndex === -1) return false;
    const prefix = entry.slice(0, starIndex);
    const suffix = entry.slice(starIndex + 1);
    return key.startsWith(prefix) && key.endsWith(suffix);
  });
}

function collectImports(pkgName) {
  const imports = new Map();
  const prefix = `${pkgName}`;
  const regex = new RegExp(`['\"](${prefix.replace('/', '\\/')}[^'\"]*)['\"]`, 'g');

  for (const root of roots) {
    for (const file of walk(path.join(repoRoot, root))) {
      const text = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = regex.exec(text))) {
        const specifier = match[1];
        const subpath = specifier === pkgName ? '' : specifier.slice(pkgName.length + 1);
        imports.set(specifier, path.relative(repoRoot, file));
      }
    }
  }

  return imports;
}

const failures = [];

for (const pkgName of Object.keys(packageFiles)) {
  const exportsMap = getPackageExports(pkgName);
  const imports = collectImports(pkgName);

  for (const [specifier, file] of imports) {
    const subpath = specifier === pkgName ? '' : specifier.slice(pkgName.length + 1);
    if (!isExported(subpath, exportsMap)) {
      failures.push(`- ${specifier} used by ${file} is not exported by ${packageFiles[pkgName]}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Package export contract violations found:\n');
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log('Package exports cover all current package-to-package imports.');
