import type { PlatformInfo } from './types';

export interface PlatformCapabilities {
  supportsExec: boolean;
  supportsVirtualFileSystem: boolean;
  supportsExternalEditor: boolean;
}

export function getPlatformCapabilities(platform: PlatformInfo): PlatformCapabilities {
  const isNodeTerminal = platform.type === 'cli' || platform.type === 'tui';
  const supportsExec = platform.isDesktop
    ? platform.os === 'macos' || platform.os === 'linux'
    : isNodeTerminal;

  return {
    supportsExec,
    supportsVirtualFileSystem: platform.type === 'browser' || platform.type === 'mobile',
    supportsExternalEditor: isNodeTerminal || platform.isDesktop,
  };
}
