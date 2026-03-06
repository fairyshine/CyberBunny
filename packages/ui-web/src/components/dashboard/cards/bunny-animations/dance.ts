import type { BunnyAnimation } from './types';

export const danceAnimation: BunnyAnimation = {
  name: 'dance',
  animClass: 'animate-[mascot-dance_1.2s_ease-in-out]',
  duration: 1200,
  keyframes: `
    @keyframes mascot-dance {
      0%, 100% { transform: translateX(0) rotate(0deg); }
      10% { transform: translateX(-8px) rotate(-8deg); }
      20% { transform: translateX(8px) rotate(8deg); }
      30% { transform: translateX(-8px) rotate(-8deg) translateY(-6px); }
      40% { transform: translateX(8px) rotate(8deg) translateY(-6px); }
      50% { transform: translateX(-6px) rotate(-6deg); }
      60% { transform: translateX(6px) rotate(6deg); }
      70% { transform: translateX(-8px) rotate(-8deg) translateY(-4px); }
      80% { transform: translateX(8px) rotate(8deg) translateY(-4px); }
      90% { transform: translateX(-4px) rotate(-4deg); }
    }
  `,
  shadowWidth: 32,
  onStart: ({ spawnParticles }) => {
    spawnParticles('\u{1F3B5}', 3);
    setTimeout(() => spawnParticles('\u{1F3B6}', 2), 400);
  },
};
