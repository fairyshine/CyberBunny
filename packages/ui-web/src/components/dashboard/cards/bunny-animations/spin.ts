import type { BunnyAnimation } from './types';

export const spinAnimation: BunnyAnimation = {
  name: 'spin',
  animClass: 'animate-[mascot-spin_0.7s_ease-in-out]',
  duration: 800,
  keyframes: `
    @keyframes mascot-spin {
      0% { transform: rotateY(0deg); }
      100% { transform: rotateY(360deg); }
    }
  `,
};
