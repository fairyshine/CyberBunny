declare const process: {
  env?: Record<string, string | undefined>;
  platform?: string;
} | undefined;

export const OPENBUNNY_CONFIG_DIR_ENV = 'OPENBUNNY_CONFIG_DIR';

function joinPath(windows: boolean, ...segments: string[]): string {
  const separator = windows ? '\\' : '/';
  let prefix = '';
  let result = '';

  for (const [index, segment] of segments.entries()) {
    const withoutTrailing = segment.replace(/[\\/]+$/g, '');
    const drivePrefix = withoutTrailing.match(/^[A-Za-z]:/)?.[0];
    const cleaned = index === 0
      ? withoutTrailing.replace(/^[\\/]+/, '')
      : withoutTrailing.replace(/^[\\/]+|[\\/]+$/g, '');
    if (!cleaned) {
      if (index === 0 && /^[\\/]+$/.test(segment)) {
        prefix = separator;
      }
      continue;
    }

    if (index === 0) {
      if (drivePrefix) {
        prefix = drivePrefix;
        result = cleaned.slice(drivePrefix.length).replace(/^[\\/]+/, '');
        continue;
      }
      if (/^[\\/]/.test(segment)) {
        prefix = separator;
      }
    }

    result = result ? `${result}${separator}${cleaned}` : cleaned;
  }

  if (!prefix) {
    return result;
  }

  if (!result) {
    return prefix;
  }

  return /^[A-Za-z]:$/.test(prefix) ? `${prefix}${separator}${result}` : `${prefix}${result}`;
}

function getHomeDir(env: Record<string, string | undefined>): string {
  return env.HOME?.trim() || env.USERPROFILE?.trim() || '.';
}

export function resolveNodeConfigDir(env: Record<string, string | undefined> = process?.env || {}): string {
  const override = env[OPENBUNNY_CONFIG_DIR_ENV]?.trim();
  if (override) {
    return override;
  }

  const xdgConfigHome = env.XDG_CONFIG_HOME?.trim();
  if (xdgConfigHome) {
    return joinPath(false, xdgConfigHome, 'openbunny');
  }

  const platform = process?.platform;
  const windows = platform === 'win32';
  const homeDir = getHomeDir(env);

  switch (platform) {
    case 'darwin':
      return joinPath(false, homeDir, 'Library', 'Application Support', 'openbunny');
    case 'win32':
      return joinPath(true, env.APPDATA || joinPath(true, homeDir, 'AppData', 'Roaming'), 'openbunny');
    default:
      return joinPath(windows, homeDir, '.config', 'openbunny');
  }
}
