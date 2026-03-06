import React from 'react';
import type { BunnyAnimation, AnimationContext } from './types';

const SleepOverlay = ({ anim }: AnimationContext) => {
  if (anim !== 'sleep') return null;
  return React.createElement(React.Fragment, null,
    React.createElement('span', {
      className: 'absolute text-sm font-bold text-foreground/50',
      style: { top: '15%', right: '25%', animation: 'zzz-float 2s ease-out infinite' },
    }, 'Z'),
    React.createElement('span', {
      className: 'absolute text-base font-bold text-foreground/40',
      style: { top: '10%', right: '20%', animation: 'zzz-float 2s ease-out 0.5s infinite' },
    }, 'Z'),
    React.createElement('span', {
      className: 'absolute text-lg font-bold text-foreground/30',
      style: { top: '5%', right: '15%', animation: 'zzz-float 2s ease-out 1s infinite' },
    }, 'Z'),
  );
};

export const sleepAnimation: BunnyAnimation = {
  name: 'sleep',
  animClass: 'animate-[mascot-sleep_2s_ease-in-out]',
  duration: 2000,
  keyframes: `
    @keyframes mascot-sleep {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      25% { transform: translateY(4px) rotate(-3deg); }
      50% { transform: translateY(6px) rotate(0deg) scale(0.97); }
      75% { transform: translateY(4px) rotate(3deg); }
    }
    @keyframes zzz-float {
      0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
      30% { opacity: 1; transform: translate(8px, -12px) scale(0.8); }
      60% { opacity: 0.8; transform: translate(16px, -24px) scale(1); }
      100% { opacity: 0; transform: translate(24px, -36px) scale(1.2); }
    }
  `,

  shadowWidth: 40,
  shadowOpacity: 0.8,
  overlay: (ctx) => SleepOverlay(ctx),
};
