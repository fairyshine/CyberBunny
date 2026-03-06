export type { AnimationName, Particle, AnimationContext, BunnyAnimation, AnimationHelpers } from './types';

import { idleAnimation } from './idle';
import { bounceAnimation } from './bounce';
import { shakeAnimation } from './shake';
import { glowAnimation } from './glow';
import { spinAnimation } from './spin';
import { eatAnimation } from './eat';
import { sleepAnimation } from './sleep';
import { danceAnimation } from './dance';
import type { BunnyAnimation, AnimationName } from './types';

export const animations: Record<AnimationName, BunnyAnimation> = {
  idle: idleAnimation,
  bounce: bounceAnimation,
  shake: shakeAnimation,
  glow: glowAnimation,
  spin: spinAnimation,
  eat: eatAnimation,
  sleep: sleepAnimation,
  dance: danceAnimation,
};

/** Names eligible for auto-play cycle (everything except idle) */
export const autoPlayNames: AnimationName[] = ['bounce', 'shake', 'glow', 'spin', 'eat', 'sleep', 'dance'];

/** Names eligible for click cycle */
export const clickPlayNames: AnimationName[] = ['bounce', 'eat', 'dance', 'spin'];

/** Shared keyframes used by the card container (particles, sparkles, effects) */
export const sharedKeyframes = `
  @keyframes bubble-in {
    0% { opacity: 0; transform: translateY(6px) scale(0.9); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0); }
    50% { opacity: 1; transform: scale(1); }
  }
  @keyframes particle-fly {
    0% { opacity: 1; transform: translate(0, 0) scale(1); }
    100% { opacity: 0; transform: translate(var(--px), var(--py)) scale(0.3); }
  }
  @keyframes halo-pulse {
    0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    50% { opacity: 0.3; transform: translate(-50%, -50%) scale(1.2); }
  }
  @keyframes rainbow-border {
    0% { border-color: rgba(239,68,68,0.4); box-shadow: 0 0 12px rgba(239,68,68,0.2); }
    16% { border-color: rgba(249,115,22,0.4); box-shadow: 0 0 12px rgba(249,115,22,0.2); }
    33% { border-color: rgba(234,179,8,0.4); box-shadow: 0 0 12px rgba(234,179,8,0.2); }
    50% { border-color: rgba(34,197,94,0.4); box-shadow: 0 0 12px rgba(34,197,94,0.2); }
    66% { border-color: rgba(59,130,246,0.4); box-shadow: 0 0 12px rgba(59,130,246,0.2); }
    83% { border-color: rgba(168,85,247,0.4); box-shadow: 0 0 12px rgba(168,85,247,0.2); }
    100% { border-color: rgba(239,68,68,0.4); box-shadow: 0 0 12px rgba(239,68,68,0.2); }
  }
`;

/** Collect all keyframes from every animation + shared */
export function getAllKeyframes(): string {
  return Object.values(animations).map(a => a.keyframes).join('\n') + '\n' + sharedKeyframes;
}
