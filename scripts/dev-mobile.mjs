import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sharedDir = path.join(repoRoot, 'packages', 'shared');

const isDryRun = process.argv.includes('--dry-run');
const argSeparatorIndex = process.argv.indexOf('--');
const forwardedExpoArgs = argSeparatorIndex >= 0 ? process.argv.slice(argSeparatorIndex + 1) : [];

const initialBuildCommand = ['pnpm', ['--filter', '@openbunny/shared', 'build']];
const expoCommand = ['pnpm', ['--filter', '@openbunny/mobile', 'start:runtime', ...(forwardedExpoArgs.length > 0 ? ['--', ...forwardedExpoArgs] : [])]];

const watchTargets = [
  path.join(sharedDir, 'src'),
  path.join(sharedDir, 'scripts'),
  path.join(sharedDir, 'package.json'),
  path.join(sharedDir, 'tsconfig.json'),
  path.join(sharedDir, 'tsconfig.build.json'),
];

if (isDryRun) {
  console.log([...initialBuildCommand[0] ? [initialBuildCommand[0]] : [], ...initialBuildCommand[1]].join(' '));
  console.log([...expoCommand[0] ? [expoCommand[0]] : [], ...expoCommand[1]].join(' '));
  console.log(`# watch ${watchTargets.map((target) => path.relative(repoRoot, target)).join(', ')}`);
  process.exit(0);
}

let expoProcess = null;
let sharedBuildProcess = null;
let shutdownRequested = false;
let rebuildPending = false;
let debounceTimer = null;
const watchers = [];

function formatCommand(command, args) {
  return [command, ...args].join(' ');
}

function stopWatchers() {
  for (const watcher of watchers) {
    watcher.close();
  }
  watchers.length = 0;
}

function terminateChild(child) {
  if (child && child.exitCode === null && !child.killed) {
    child.kill('SIGINT');
  }
}

function shutdown(code = 0) {
  shutdownRequested = true;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  stopWatchers();
  terminateChild(sharedBuildProcess);
  terminateChild(expoProcess);
  process.exit(code);
}

function runSharedBuild(reason = 'initial build') {
  return new Promise((resolve, reject) => {
    console.log(`\n[dev:mobile] ${reason}: ${formatCommand(initialBuildCommand[0], initialBuildCommand[1])}`);
    sharedBuildProcess = spawn(initialBuildCommand[0], initialBuildCommand[1], {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    sharedBuildProcess.on('exit', (code) => {
      sharedBuildProcess = null;

      if (code && code !== 0) {
        reject(new Error(`shared build failed with exit code ${code}`));
        return;
      }

      resolve();
    });
  });
}

async function flushQueuedBuilds() {
  if (shutdownRequested || sharedBuildProcess || !rebuildPending) return;
  rebuildPending = false;

  try {
    await runSharedBuild('shared change detected');
  } catch (error) {
    console.error(`[dev:mobile] ${error instanceof Error ? error.message : String(error)}`);
    shutdown(1);
    return;
  }

  if (rebuildPending) {
    await flushQueuedBuilds();
  }
}

function scheduleSharedRebuild(changedPath) {
  if (shutdownRequested) return;

  const relativePath = path.relative(repoRoot, changedPath);
  rebuildPending = true;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    console.log(`[dev:mobile] change detected in ${relativePath}`);
    void flushQueuedBuilds();
  }, 120);
}

function startExpo() {
  console.log(`\n[dev:mobile] starting Expo: ${formatCommand(expoCommand[0], expoCommand[1])}`);
  expoProcess = spawn(expoCommand[0], expoCommand[1], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  expoProcess.on('exit', (code) => {
    if (shutdownRequested) return;
    shutdown(code ?? 0);
  });
}

function registerWatchers() {
  for (const target of watchTargets) {
    const watcher = watch(target, { recursive: target.endsWith('src') || target.endsWith('scripts') }, (_eventType, filename) => {
      const changedPath = filename ? path.join(target, filename.toString()) : target;
      scheduleSharedRebuild(changedPath);
    });
    watchers.push(watcher);
  }
}

try {
  await runSharedBuild();
} catch (error) {
  console.error(`[dev:mobile] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

registerWatchers();
startExpo();

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
