import React from 'react';
import type { BunnyAnimation, AnimationContext } from './types';

/**
 * Carrot overlay: positioned at the bunny's mouth area.
 * carrotBite 0 = full carrot, 1 = bitten, 2 = small piece, 3 = gone (crumbs fly).
 */
const EatOverlay = ({ carrotVisible, carrotBite }: AnimationContext) => {
  if (!carrotVisible) return null;

  // Carrot shrinks as it gets eaten: full → bitten → stub → gone
  const stages: { text: string; size: string; rotate: number }[] = [
    { text: '\u{1F955}', size: '2.2rem', rotate: -125 },   // full carrot, rotated -90 from before
    { text: '\u{1F955}', size: '1.6rem', rotate: -120 },   // bitten
    { text: '\u{1F955}', size: '1rem', rotate: -115 },     // small stub
    { text: '', size: '0', rotate: 0 },                     // gone
  ];
  const stage = stages[Math.min(carrotBite, 3)];
  if (!stage.text) return null;

  return React.createElement(
    React.Fragment,
    null,
    // The carrot itself, held near the bunny's mouth
    React.createElement('div', {
      className: 'absolute pointer-events-none',
      style: {
        // Position to the lower-left of the bunny's face
        top: '62%',
        left: '48%',
        fontSize: stage.size,
        transform: `rotate(${stage.rotate}deg)`,
        transition: 'font-size 0.15s ease, transform 0.15s ease',
        zIndex: 10,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
      },
    }, stage.text),
    // Bite crumbs that fly out on each bite
    carrotBite >= 1 && carrotBite <= 2 && React.createElement('div', {
      key: `crumb-${carrotBite}`,
      className: 'absolute pointer-events-none',
      style: {
        top: '46%',
        left: '58%',
        zIndex: 11,
      },
    },
      // Small orange crumb particles
      ...[0, 1, 2].map(i =>
        React.createElement('span', {
          key: i,
          className: 'absolute',
          style: {
            fontSize: '0.5rem',
            color: '#f97316',
            animation: `crumb-fly-${i} 0.5s ease-out forwards`,
          },
        }, '\u25CF') // ● orange dot as crumb
      ),
    ),
  );
};

export const eatAnimation: BunnyAnimation = {
  name: 'eat',
  animClass: 'animate-[mascot-eat_2s_ease-in-out]',
  duration: 2000,
  keyframes: `
    @keyframes mascot-eat {
      0%   { transform: translateY(0) rotate(0deg); }
      8%   { transform: translateY(0) rotate(8deg); }
      /* Bite 1: head dips down-right toward carrot */
      12%  { transform: translateY(3px) rotate(10deg) scale(1.02); }
      18%  { transform: translateY(0) rotate(6deg); }
      /* Bite 2 */
      28%  { transform: translateY(0) rotate(8deg); }
      32%  { transform: translateY(3px) rotate(10deg) scale(1.02); }
      38%  { transform: translateY(0) rotate(6deg); }
      /* Bite 3 */
      48%  { transform: translateY(0) rotate(8deg); }
      52%  { transform: translateY(3px) rotate(10deg) scale(1.02); }
      58%  { transform: translateY(0) rotate(6deg); }
      /* Satisfied wiggle */
      68%  { transform: translateY(-2px) rotate(0deg) scale(1.05); }
      76%  { transform: translateY(0) rotate(-3deg) scale(1.03); }
      84%  { transform: translateY(0) rotate(3deg) scale(1.03); }
      92%  { transform: translateY(0) rotate(-2deg); }
      100% { transform: translateY(0) rotate(0deg); }
    }
    /* Crumb particles flying in different directions */
    @keyframes crumb-fly-0 {
      0%   { opacity: 1; transform: translate(0, 0) scale(1); }
      100% { opacity: 0; transform: translate(12px, -18px) scale(0.4); }
    }
    @keyframes crumb-fly-1 {
      0%   { opacity: 1; transform: translate(0, 0) scale(1); }
      100% { opacity: 0; transform: translate(18px, -6px) scale(0.3); }
    }
    @keyframes crumb-fly-2 {
      0%   { opacity: 1; transform: translate(0, 0) scale(1); }
      100% { opacity: 0; transform: translate(8px, 12px) scale(0.3); }
    }
  `,
  overlay: (ctx) => EatOverlay(ctx),
  onStart: ({ spawnParticles, setCarrotVisible, setCarrotBite, setAnim }) => {
    setCarrotVisible(true);
    setCarrotBite(0);
    // Bite 1 — synced with the head-dip at 12%
    setTimeout(() => setCarrotBite(1), 240);
    // Bite 2 — synced with 32%
    setTimeout(() => setCarrotBite(2), 640);
    // Bite 3 — carrot gone, crumbs fly
    setTimeout(() => {
      setCarrotBite(3);
      spawnParticles('\u{1F955}', 3);
    }, 1040);
    // Finish: satisfied, sparkles
    setTimeout(() => {
      setCarrotVisible(false);
      setCarrotBite(0);
      setAnim('idle');
      spawnParticles('\u2728', 4);
    }, 2000);
  },
};
