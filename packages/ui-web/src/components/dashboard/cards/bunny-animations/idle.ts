import type { BunnyAnimation } from './types';

export const idleAnimation: BunnyAnimation = {
  name: 'idle',
  animClass: '',
  duration: 0,
  keyframes: `
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
  `,
};
