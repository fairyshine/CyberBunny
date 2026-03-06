import type { BunnyAnimation } from './types';

export const bounceAnimation: BunnyAnimation = {
  name: 'bounce',
  animClass: 'animate-[mascot-bounce_0.5s_ease-in-out]',
  duration: 600,
  keyframes: `
    @keyframes mascot-bounce {
      0%, 100% { transform: translateY(0) scale(1); }
      30% { transform: translateY(-18px) scale(1.08); }
      50% { transform: translateY(-10px) scale(1.04); }
      70% { transform: translateY(-14px) scale(1.06); }
    }
  `,
  shadowWidth: 28,
  shadowOpacity: 0.4,
};
