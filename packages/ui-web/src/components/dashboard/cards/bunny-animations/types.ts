import type { ReactNode } from 'react';

export type AnimationName = 'idle' | 'bounce' | 'shake' | 'glow' | 'spin' | 'eat' | 'sleep' | 'dance';

export interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

export interface AnimationContext {
  anim: AnimationName;
  isHovered: boolean;
  particles: Particle[];
  // eat-specific state
  carrotVisible: boolean;
  carrotBite: number;
}

export interface BunnyAnimation {
  /** Unique name */
  name: AnimationName;
  /** Tailwind animate class applied to the bunny emoji */
  animClass: string;
  /** Duration in ms for auto-play */
  duration: number;
  /** CSS @keyframes string (mascot keyframe + any extras) */
  keyframes: string;
  /** Optional overlay elements rendered inside the container */
  overlay?: (ctx: AnimationContext) => ReactNode;
  /** Called when this animation starts playing */
  onStart?: (helpers: AnimationHelpers) => void;
  /** Shadow width override */
  shadowWidth?: number;
  /** Shadow opacity override */
  shadowOpacity?: number;
  /** Emoji override (e.g. sleep shows 😴) */
  emoji?: string;
}

export interface AnimationHelpers {
  spawnParticles: (emoji: string, count?: number) => void;
  setCarrotVisible: (v: boolean) => void;
  setCarrotBite: (v: number) => void;
  setAnim: (a: AnimationName) => void;
}
