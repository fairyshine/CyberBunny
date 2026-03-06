import type { BunnyAnimation } from './types';

export const glowAnimation: BunnyAnimation = {
  name: 'glow',
  animClass: 'animate-[mascot-glow_0.8s_ease-in-out]',
  duration: 800,
  keyframes: `
    @keyframes mascot-glow {
      0%, 100% { filter: drop-shadow(0 0 0px transparent); }
      25% { filter: drop-shadow(0 0 16px rgba(168,85,247,0.5)) drop-shadow(0 0 32px rgba(59,130,246,0.3)); }
      50% { filter: drop-shadow(0 0 24px rgba(236,72,153,0.6)) drop-shadow(0 0 48px rgba(168,85,247,0.4)); }
      75% { filter: drop-shadow(0 0 16px rgba(59,130,246,0.5)) drop-shadow(0 0 32px rgba(236,72,153,0.3)); }
    }
  `,
};
