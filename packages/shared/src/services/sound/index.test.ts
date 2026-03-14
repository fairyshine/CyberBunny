import test from 'node:test';
import assert from 'node:assert/strict';
import { soundManager, SOUND_EFFECTS, type ISoundBackend, type SoundSettingsSnapshot } from './index';

function createSettings(overrides: Partial<SoundSettingsSnapshot> = {}): SoundSettingsSnapshot {
  return {
    masterMuted: false,
    soundEffectsEnabled: true,
    masterVolume: 0.5,
    ...overrides,
  };
}

test('soundManager plays through backend using injected settings resolver', () => {
  const calls: Array<{ sound: string; volume: number | undefined }> = [];
  const backend: ISoundBackend = {
    play(sound, volume) {
      calls.push({ sound, volume });
    },
  };

  soundManager.dispose();
  soundManager.setBackend(backend);
  soundManager.setSettingsResolver(() => createSettings({ masterVolume: 0.8 }));

  try {
    soundManager.play(SOUND_EFFECTS[0]);
    assert.deepEqual(calls, [{ sound: SOUND_EFFECTS[0], volume: 0.8 }]);
  } finally {
    soundManager.dispose();
    soundManager.setSettingsResolver(() => createSettings());
  }
});

test('soundManager suppresses playback when muted or disabled', () => {
  const calls: Array<{ sound: string; volume: number | undefined }> = [];
  const backend: ISoundBackend = {
    play(sound, volume) {
      calls.push({ sound, volume });
    },
  };

  soundManager.dispose();
  soundManager.setBackend(backend);

  try {
    soundManager.setSettingsResolver(() => createSettings({ masterMuted: true }));
    soundManager.play(SOUND_EFFECTS[1]);

    soundManager.setSettingsResolver(() => createSettings({ soundEffectsEnabled: false }));
    soundManager.play(SOUND_EFFECTS[2]);

    assert.deepEqual(calls, []);
  } finally {
    soundManager.dispose();
    soundManager.setSettingsResolver(() => createSettings());
  }
});
