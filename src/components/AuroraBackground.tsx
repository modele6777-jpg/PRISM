import React, { useMemo } from 'react';
import {
  getPerfProfile,
  isFoldCoverScreen,
  isGalaxyFoldSeClass,
  isLegacyMobile,
} from '@/lib/perfMode';

/** Deep-space palette for PRISM cosmic theme */
const COSMOS = {
  void: 'oklch(0.035 0.03 275)',
  abyss: 'oklch(0.055 0.04 265)',
  nebulaViolet: 'oklch(0.48 0.22 295)',
  nebulaBlue: 'oklch(0.42 0.19 255)',
  nebulaMagenta: 'oklch(0.52 0.21 330)',
  nebulaCyan: 'oklch(0.50 0.14 215)',
  galacticGold: 'oklch(0.72 0.10 85)',
};

function withAlpha(color: string, alpha: number): string {
  return color.replace(/\)$/, ` / ${alpha})`);
}

function buildStaticStars(count: number, minAlpha = 0.35): string {
  const layers: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = (i * 17 + 11) % 100;
    const y = (i * 23 + 7) % 100;
    const size = i % 4 === 0 ? 2 : i % 2 === 0 ? 1.5 : 1;
    const alpha = minAlpha + (i % 5) * 0.1;
    layers.push(
      `radial-gradient(${size}px ${size}px at ${x}% ${y}%, rgba(255,255,255,${alpha}) 50%, transparent 100%)`,
    );
  }
  return layers.join(', ');
}

function meteorFlightAngle(endX: number, endY: number): number {
  if (typeof window === 'undefined') return 22;
  const ratio = window.innerHeight / window.innerWidth;
  return Math.round((Math.atan2(endY * ratio, endX) * 180) / Math.PI);
}

/** Pseudo-random spread (stable per index) across 0..max */
function spreadAt(index: number, salt: number, max: number): number {
  return ((index * 37 + salt * 17) % 1000) / 1000 * max;
}

const METEOR_SEQUENCE_CYCLE_S = 12;

function ShootingStars({ count }: { count: number }) {
  const meteors = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        // Left edge columns + full-height lanes so meteors spawn across the screen, not one corner.
        const laneCols = Math.min(4, Math.max(2, Math.ceil(count / 3)));
        const laneRows = Math.ceil(count / laneCols);
        const col = i % laneCols;
        const row = Math.floor(i / laneCols) % laneRows;

        const startLeft = -6 + col * (28 / Math.max(laneCols - 1, 1)) + spreadAt(i, 1, 4);
        const startTop = 4 + row * (72 / Math.max(laneRows - 1, 1)) + spreadAt(i, 2, 6);

        // Travel left → right with a gentle downward arc.
        const endX = 68 + spreadAt(i, 3, 34);
        const endY = 12 + spreadAt(i, 4, 28) + col * 3;

        const stagger = (METEOR_SEQUENCE_CYCLE_S * 0.88) / Math.max(count, 1);
        return {
          id: i,
          startLeft,
          startTop,
          trail: 64 + spreadAt(i, 5, 48),
          angle: meteorFlightAngle(endX, endY),
          endX,
          endY,
          cycle: METEOR_SEQUENCE_CYCLE_S,
          delay: i * stagger + spreadAt(i, 6, 2.4),
        };
      }),
    [count],
  );

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {meteors.map((meteor) => (
        <div
          key={meteor.id}
          className="cosmic-meteor"
          style={{
            left: `${meteor.startLeft}%`,
            top: `${meteor.startTop}%`,
            ['--meteor-angle' as string]: `${meteor.angle}deg`,
            ['--meteor-trail' as string]: `${meteor.trail}px`,
            ['--meteor-end-x' as string]: `${meteor.endX}vw`,
            ['--meteor-end-y' as string]: `${meteor.endY}vh`,
            ['--meteor-cycle' as string]: `${meteor.cycle}s`,
            ['--meteor-delay' as string]: `${meteor.delay}s`,
          }}
        >
          <span className="cosmic-meteor__streak" />
        </div>
      ))}
    </div>
  );
}

function Starfield({ density, minSize }: { density: number; minSize: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: density }, (_, i) => ({
        id: i,
        left: `${(i * 37 + 13) % 100}%`,
        top: `${(i * 53 + 9) % 100}%`,
        size: Math.max(minSize, i % 7 === 0 ? 2.5 : i % 3 === 0 ? 2 : 1.5),
        opacity: 0.35 + (i % 5) * 0.12,
        twinkle: i % 11 === 0,
      })),
    [density, minSize],
  );

  return (
    <div className="absolute inset-0" aria-hidden>
      {stars.map((star) => (
        <div
          key={star.id}
          className={`absolute rounded-full bg-white ${star.twinkle ? 'cosmic-star-twinkle' : ''}`}
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            boxShadow: '0 0 4px rgba(255,255,255,0.65)',
          }}
        />
      ))}
    </div>
  );
}

type NebulaOrbProps = {
  positionClass: string;
  orbClass?: string;
  color: string;
  opacity: number;
  blurPx: number;
  animate?: boolean;
  animationDuration?: string;
};

function NebulaOrb({
  positionClass,
  orbClass,
  color,
  opacity,
  blurPx,
  animate = true,
  animationDuration,
}: NebulaOrbProps) {
  return (
    <div
      className={`absolute rounded-full ${positionClass} ${animate && orbClass ? orbClass : ''}`}
      style={{
        backgroundColor: color,
        opacity,
        filter: `blur(${blurPx}px)`,
        WebkitFilter: `blur(${blurPx}px)`,
        animationDuration,
      }}
    />
  );
}

export const AuroraBackground: React.FC = () => {
  const profile = getPerfProfile();
  const { void: voidColor, abyss, nebulaViolet, nebulaBlue, nebulaMagenta, nebulaCyan, galacticGold } =
    COSMOS;

  const legacy = isLegacyMobile();
  const foldCover = isGalaxyFoldSeClass() && isFoldCoverScreen();
  const galaxy = profile === 'galaxy';
  const starDensity = legacy
    ? 42
    : foldCover
      ? 64
      : profile === 'pwa'
        ? 58
        : profile === 'reduced'
          ? 68
          : galaxy
            ? 90
            : 96;
  const minStarSize = legacy ? 2 : 1.5;
  const nebulaBlur = legacy ? 48 : foldCover ? 82 : profile === 'full' || galaxy ? 104 : 72;
  const animateOrbs = profile === 'full' || (galaxy && !foldCover);
  const staticStarCount = legacy ? 32 : foldCover ? 40 : 48;
  const shootingStarCount = legacy ? 3 : foldCover ? 5 : profile === 'full' ? 9 : galaxy ? 8 : 6;

  return (
    <div className="prism-aura-bg fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: [
            buildStaticStars(staticStarCount),
            `radial-gradient(ellipse 95% 60% at 50% 108%, ${withAlpha(nebulaViolet, 0.28)} 0%, transparent 62%)`,
            `radial-gradient(ellipse 75% 55% at 6% 20%, ${withAlpha(nebulaBlue, 0.32)} 0%, transparent 58%)`,
            `radial-gradient(ellipse 70% 52% at 94% 32%, ${withAlpha(nebulaMagenta, 0.26)} 0%, transparent 55%)`,
            `radial-gradient(ellipse 58% 45% at 74% 80%, ${withAlpha(nebulaCyan, 0.22)} 0%, transparent 52%)`,
            `radial-gradient(ellipse 42% 34% at 26% 66%, ${withAlpha(galacticGold, 0.14)} 0%, transparent 50%)`,
            `linear-gradient(180deg, ${voidColor} 0%, ${abyss} 38%, oklch(0.042 0.038 290) 72%, oklch(0.03 0.025 280) 100%)`,
          ].join(', '),
        }}
      />

      {/* Galactic band */}
      <div
        className={`absolute left-[-20%] top-[16%] w-[140%] h-[30%] rotate-[-12deg] ${animateOrbs ? 'aura-orb-2' : ''}`}
        style={{
          opacity: legacy ? 0.2 : 0.16,
          filter: `blur(${Math.round(nebulaBlur * 0.75)}px)`,
          WebkitFilter: `blur(${Math.round(nebulaBlur * 0.75)}px)`,
          background: `linear-gradient(90deg, transparent 0%, ${withAlpha(nebulaViolet, 0.85)} 28%, ${withAlpha(nebulaMagenta, 0.8)} 52%, ${withAlpha(nebulaBlue, 0.75)} 78%, transparent 100%)`,
        }}
      />

      <NebulaOrb
        positionClass="-top-[12%] -left-[8%] w-[92vw] h-[72vw]"
        orbClass="aura-orb-1"
        color={nebulaBlue}
        opacity={legacy ? 0.42 : 0.36}
        blurPx={nebulaBlur}
        animate={animateOrbs}
      />
      <NebulaOrb
        positionClass="top-[5%] -right-[10%] w-[78vw] h-[65vw]"
        orbClass="aura-orb-2"
        color={nebulaViolet}
        opacity={legacy ? 0.38 : 0.32}
        blurPx={nebulaBlur}
        animate={animateOrbs}
      />
      <NebulaOrb
        positionClass="-bottom-[14%] right-[0%] w-[85vw] h-[68vw]"
        orbClass="aura-orb-3"
        color={nebulaMagenta}
        opacity={legacy ? 0.34 : 0.28}
        blurPx={nebulaBlur}
        animate={animateOrbs}
      />
      <NebulaOrb
        positionClass="bottom-[8%] left-[5%] w-[58vw] h-[50vw]"
        orbClass="aura-orb-1"
        color={nebulaCyan}
        opacity={legacy ? 0.28 : 0.22}
        blurPx={Math.round(nebulaBlur * 0.85)}
        animate={animateOrbs}
        animationDuration="22s"
      />
      <NebulaOrb
        positionClass="top-[42%] left-[38%] w-[38vw] h-[32vw]"
        orbClass="aura-orb-3"
        color={galacticGold}
        opacity={legacy ? 0.2 : 0.15}
        blurPx={Math.round(nebulaBlur * 0.7)}
        animate={animateOrbs}
        animationDuration="26s"
      />

      <Starfield density={starDensity} minSize={minStarSize} />
      <ShootingStars count={shootingStarCount} />

      <div
        className="absolute inset-0"
        style={{
          opacity: legacy ? 0.08 : 0.06,
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.95) 0.75px, transparent 0)',
          backgroundSize: legacy ? '36px 36px' : '42px 42px',
        }}
      />
    </div>
  );
};

export default AuroraBackground;