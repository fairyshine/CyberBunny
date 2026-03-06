import type { BunnyAnimation } from './types';

export const shakeAnimation: BunnyAnimation = {
  name: 'shake',
  animClass: 'animate-[mascot-shake_0.4s_ease-in-out]',
  duration: 500,
  keyframes: `
    @keyframes mascot-shake {
      0%, 100% { transform: rotate(0deg); }
      15% { transform: rotate(-12deg); }
      30% { transform: rotate(10deg); }
      45% { transform: rotate(-8deg); }
      60% { transform: rotate(6deg); }
      75% { transform: rotate(-3deg); }
    }
  `,
};
