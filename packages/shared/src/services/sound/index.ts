/**
 * Sound Manager — singleton with pluggable backend.
 *
 * Backend selection:
 * - Browser / Electron: use-sound (Howler.js), injected by web/desktop platform init
 * - React Native: expo-av, injected by mobile platform init
 * - CLI / TUI: no-op (no backend injected)
 *
 * Sound on/off and volume are provided by an app-level settings resolver.
 */

import type { SoundEffect, ISoundBackend } from './types';

export { SOUND_EFFECTS } from './types';
export type { SoundEffect, ISoundBackend } from './types';

export interface SoundSettingsSnapshot {
  masterMuted: boolean;
  soundEffectsEnabled: boolean;
  masterVolume: number;
}

const DEFAULT_SOUND_SETTINGS: SoundSettingsSnapshot = {
  masterMuted: false,
  soundEffectsEnabled: true,
  masterVolume: 0.5,
};

const noopBackend: ISoundBackend = {
  play() {},
};

class SoundManager {
  private backend: ISoundBackend = noopBackend;

  private settingsResolver: () => SoundSettingsSnapshot = () => DEFAULT_SOUND_SETTINGS;

  /** Replace the audio backend (called during platform init). */
  setBackend(backend: ISoundBackend): void {
    this.backend = backend;
    backend.preload?.();
  }

  /** Inject a settings resolver from the app edge. */
  setSettingsResolver(resolver: () => SoundSettingsSnapshot): void {
    this.settingsResolver = resolver;
  }

  /** Play a sound effect. Respects masterMuted, soundEffectsEnabled, and masterVolume. */
  play(sound: SoundEffect): void {
    const { masterMuted, soundEffectsEnabled, masterVolume } = this.settingsResolver();
    if (masterMuted || !soundEffectsEnabled) return;
    this.backend.play(sound, Math.max(0, Math.min(1, masterVolume)));
  }

  /** Release resources. */
  dispose(): void {
    this.backend.dispose?.();
    this.backend = noopBackend;
  }
}

export const soundManager = new SoundManager();
