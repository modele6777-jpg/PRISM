import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Eye, RefreshCw, Activity, Sun, Compass,
  Flame, Heart, Wind, Coins, ShieldCheck, BookOpen, Zap, Star, Moon,
  ChevronLeft, ChevronRight, Shuffle,
} from 'lucide-react';
import { TAROT_DECK, TarotCard, getTarotCardImageUrl, rollTarotReversed } from '../../data/tarotData';

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  // Multi-pass cryptographic Fisher-Yates shuffle
  for (let pass = 0; pass < 3; pass += 1) {
    for (let i = newArr.length - 1; i > 0; i -= 1) {
      let rand = Math.random();
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const buffer = new Uint32Array(1);
        window.crypto.getRandomValues(buffer);
        rand = buffer[0] / (0xffffffff + 1);
      }
      const j = Math.floor(rand * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
  }
  return newArr;
};

const getTarotCardVisual = (card: TarotCard | null | undefined) => {
  if (!card) return { icon: Sparkles, color: 'text-yellow-400' };

  if (card.id?.startsWith('trinity_')) {
    const map: Record<string, { icon: typeof Sparkles; color: string }> = {
      trinity_01_source: { icon: Eye, color: 'text-indigo-400' },
      trinity_02_geometry: { icon: RefreshCw, color: 'text-cyan-400' },
      trinity_03_ascension: { icon: Sparkles, color: 'text-yellow-400' },
      trinity_04_mirror: { icon: Activity, color: 'text-zinc-400' },
      trinity_05_logos: { icon: Sun, color: 'text-amber-400' },
      trinity_06_alignment: { icon: Compass, color: 'text-yellow-400' },
      trinity_07_eye: { icon: Eye, color: 'text-purple-400' },
      trinity_08_shaman: { icon: Sparkles, color: 'text-rose-400' },
      trinity_09_cube: { icon: ShieldCheck, color: 'text-blue-400' },
      trinity_10_trinity: { icon: Sparkles, color: 'text-yellow-500' },
    };
    return map[card.id] ?? { icon: Sparkles, color: 'text-yellow-400' };
  }

  if (card.id?.startsWith('wands_')) return { icon: Flame, color: 'text-amber-500' };
  if (card.id?.startsWith('cups_')) return { icon: Heart, color: 'text-blue-400' };
  if (card.id?.startsWith('swords_')) return { icon: Wind, color: 'text-purple-400' };
  if (card.id?.startsWith('pent_')) return { icon: Coins, color: 'text-yellow-400' };

  const majorMap: Record<string, { icon: typeof Sparkles; color: string }> = {
    major_0: { icon: Eye, color: 'text-zinc-400' },
    major_1: { icon: Sparkles, color: 'text-amber-400' },
    major_2: { icon: Eye, color: 'text-indigo-400' },
    major_3: { icon: Heart, color: 'text-rose-400' },
    major_4: { icon: ShieldCheck, color: 'text-yellow-500' },
    major_5: { icon: BookOpen, color: 'text-blue-400' },
    major_6: { icon: Heart, color: 'text-pink-400' },
    major_7: { icon: Zap, color: 'text-yellow-400' },
    major_8: { icon: ShieldCheck, color: 'text-amber-500' },
    major_9: { icon: Eye, color: 'text-amber-400' },
    major_10: { icon: RefreshCw, color: 'text-cyan-400' },
    major_11: { icon: Activity, color: 'text-yellow-400' },
    major_12: { icon: RefreshCw, color: 'text-violet-400' },
    major_13: { icon: Activity, color: 'text-purple-500' },
    major_14: { icon: Wind, color: 'text-cyan-300' },
    major_15: { icon: Zap, color: 'text-red-500' },
    major_16: { icon: Zap, color: 'text-orange-500' },
    major_17: { icon: Star, color: 'text-yellow-300' },
    major_18: { icon: Moon, color: 'text-blue-300' },
    major_19: { icon: Sun, color: 'text-orange-400' },
    major_20: { icon: Sparkles, color: 'text-purple-400' },
    major_21: { icon: Sparkles, color: 'text-indigo-500' },
  };
  return majorMap[card.id] ?? { icon: Sparkles, color: 'text-yellow-400' };
};

type DeckWheelCardProps = {
  card: TarotCard;
  originalIdx: number;
  positionIdx: number;
  radius: number;
  offset: { radOffset: number; angleOffset: number };
  isMobile: boolean;
  totalCards: number;
};

// Ultra-lightweight card memoization without separate GPU layers per card
const DeckWheelCard = React.memo(function DeckWheelCard({
  positionIdx,
  radius,
  offset,
  isMobile,
  totalCards,
}: DeckWheelCardProps) {
  // Distribute cards evenly along the full 360 degree wheel
  const step = (2 * Math.PI) / totalCards;
  const localAngle = positionIdx * step + offset.angleOffset;
  const finalRadius = radius + offset.radOffset;
  const cardRotate = (localAngle * 180) / Math.PI + 90;
  const x = Math.round(finalRadius * Math.cos(localAngle) * 10) / 10;
  const y = Math.round(finalRadius * Math.sin(localAngle) * 10) / 10;

  return (
    <div
      className="absolute left-1/2 top-1/2 w-16 h-26 sm:w-20 sm:h-32 md:w-28 md:h-44 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black rounded-lg sm:rounded-xl md:rounded-2xl border border-yellow-500/30 shadow-[0_4px_16px_rgba(0,0,0,0.6)] flex items-center justify-center pointer-events-none select-none"
      style={{
        transform: `translate3d(-50%, -50%, 0) translate3d(${x}px, ${y}px, 0) rotate(${cardRotate}deg)`,
        transformOrigin: 'center center',
        zIndex: 10 + positionIdx,
        backfaceVisibility: 'hidden',
      }}
    >
      <div className="absolute inset-1 sm:inset-1.5 border border-yellow-500/15 rounded-md sm:rounded-lg md:rounded-xl pointer-events-none" />
      <div className="absolute inset-0.5 border border-yellow-500/25 rounded-md sm:rounded-lg md:rounded-xl flex flex-col items-center justify-center bg-yellow-500/[0.03] overflow-hidden pointer-events-none">
        <div className="absolute w-full h-[1px] bg-yellow-500/15" />
        <div className="absolute h-full w-[1px] bg-yellow-500/15" />
        <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-11 md:h-11 rounded-full border border-yellow-500/30 flex items-center justify-center bg-black/80 shadow-md relative z-10">
          <Sparkles
            className="text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]"
            size={isMobile ? 11 : 16}
          />
        </div>
      </div>
    </div>
  );
});

interface TarotSpreadProps {
  onComplete: (cards: TarotCard[]) => void;
  onCancel: () => void;
  maxCards?: number;
  concern?: string;
  positions?: string[];
  spreadName?: string;
  spreadReason?: string;
}

export const TarotSpread: React.FC<TarotSpreadProps> = ({
  onComplete,
  onCancel,
  maxCards = 3,
  concern = '',
  positions = [],
  spreadName = '',
  spreadReason = '',
}) => {
  const concernText = concern.trim();
  const hasConcern = concernText.length > 0;
  const hasSpreadMeta = spreadName.trim().length > 0;
  const compactSlots = maxCards >= 4;
  const slotClass = compactSlots
    ? 'w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-32'
    : 'w-18 h-28 md:w-28 md:h-44';
  const slotsWrapClass = compactSlots
    ? 'flex flex-wrap items-end justify-center gap-2 sm:gap-3 max-w-[92vw]'
    : 'flex items-center justify-center gap-4 md:gap-6';

  const [deck, setDeck] = useState(() => shuffleArray(TAROT_DECK));
  const cardOffsets = useMemo(
    () =>
      Array.from({ length: 78 }).map(() => ({
        radOffset: (Math.random() - 0.5) * 3,
        angleOffset: (Math.random() - 0.5) * 0.003,
      })),
    [],
  );

  const [selectedEntries, setSelectedEntries] = useState<Array<{ card: TarotCard; reversed: boolean }>>([]);
  const selectedIds = useMemo(
    () => selectedEntries.map((entry) => entry.card.id),
    [selectedEntries],
  );
  const [wheelReady, setWheelReady] = useState(false);
  const [radius, setRadius] = useState(600);
  const [yOffset, setYOffset] = useState(580);
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const wheelLayerRef = useRef<HTMLDivElement>(null);
  
  // High-performance physics refs
  const isDraggingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const lastPointerPosRef = useRef({ x: 0, y: 0 });
  const startPointerPosRef = useRef({ x: 0, y: 0 });
  const lastAngleRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0); // degrees per frame
  const rotationRef = useRef(Math.floor(Math.random() * 360));
  const hadMovedRef = useRef(false);
  const momentumRafRef = useRef<number | null>(null);

  const buildWheelTransform = useCallback(
    (deg: number) => `translate3d(-50%, calc(-50% + ${yOffset}px), 0) rotate(${deg}deg)`,
    [yOffset],
  );

  const applyRotation = useCallback(
    (deg: number) => {
      rotationRef.current = deg;
      if (wheelLayerRef.current) {
        wheelLayerRef.current.style.transform = buildWheelTransform(deg);
      }
    },
    [buildWheelTransform],
  );

  // Stop any active inertia loop
  const stopMomentum = useCallback(() => {
    if (momentumRafRef.current !== null) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
  }, []);

  // Smooth kinetic deceleration loop (60-120fps physics)
  const startMomentum = useCallback(
    (initialVelocity: number) => {
      stopMomentum();
      velocityRef.current = Math.max(-14, Math.min(14, initialVelocity));

      const step = () => {
        if (Math.abs(velocityRef.current) < 0.015) {
          velocityRef.current = 0;
          momentumRafRef.current = null;
          return;
        }

        applyRotation(rotationRef.current + velocityRef.current);
        velocityRef.current *= 0.94; // Friction damping
        momentumRafRef.current = requestAnimationFrame(step);
      };

      momentumRafRef.current = requestAnimationFrame(step);
    },
    [applyRotation, stopMomentum],
  );

  // Responsive layout calibration
  useEffect(() => {
    const updateRadius = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w < 480) {
        setRadius(Math.max(300, Math.min(380, h * 0.48)));
        setYOffset(Math.max(380, Math.min(460, h * 0.58)));
        setIsMobile(true);
      } else if (w < 768) {
        setRadius(440);
        setYOffset(520);
        setIsMobile(true);
      } else {
        setRadius(580);
        setYOffset(680);
        setIsMobile(false);
      }
    };

    updateRadius();
    const onResize = () => {
      if (!isDraggingRef.current) {
        updateRadius();
      }
    };
    window.addEventListener('resize', onResize);
    const timer = window.setTimeout(() => {
      updateRadius();
      setWheelReady(true);
    }, 50);

    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(timer);
      stopMomentum();
    };
  }, [stopMomentum]);

  // Synchronize initial wheel position
  useEffect(() => {
    if (wheelReady) {
      applyRotation(rotationRef.current);
    }
  }, [wheelReady, applyRotation]);

  const visibleDeck = useMemo(
    () =>
      deck
        .map((card, originalIdx) => ({ card, originalIdx }))
        .filter(({ card }) => !selectedIds.includes(card.id)),
    [deck, selectedIds],
  );

  // Fast geometric tap detection
  const findTappedCard = useCallback(
    (clientX: number, clientY: number): TarotCard | null => {
      if (!containerRef.current || visibleDeck.length === 0) return null;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2 + yOffset;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);
      const band = isMobile ? 140 : 180;

      // Ensure tap is within the card arc band
      if (dist < radius - band || dist > radius + band) return null;

      const pointerAngle = Math.atan2(dy, dx);
      const rotationRad = (rotationRef.current * Math.PI) / 180;
      let localAngle = pointerAngle - rotationRad;
      while (localAngle > Math.PI) localAngle -= 2 * Math.PI;
      while (localAngle < -Math.PI) localAngle += 2 * Math.PI;

      let bestCard: TarotCard | null = null;
      let bestDiff = Infinity;
      const step = (2 * Math.PI) / visibleDeck.length;

      for (let posIdx = 0; posIdx < visibleDeck.length; posIdx += 1) {
        const item = visibleDeck[posIdx];
        const cardAngle = posIdx * step + (cardOffsets[item.originalIdx]?.angleOffset ?? 0);
        let diff = Math.abs(localAngle - cardAngle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff < bestDiff) {
          bestDiff = diff;
          bestCard = item.card;
        }
      }

      return bestDiff < 0.35 ? bestCard : null;
    },
    [cardOffsets, isMobile, radius, visibleDeck, yOffset],
  );

  const handleSelect = useCallback(
    (cardToSelect: TarotCard) => {
      // Subtle tactile haptic response on mobile
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(15);
        }
      } catch (_) {}

      setSelectedEntries((prev) => {
        if (prev.some((entry) => entry.card.id === cardToSelect.id) || prev.length >= maxCards) return prev;
        const next = [...prev, { card: cardToSelect, reversed: rollTarotReversed() }];
        if (next.length === maxCards) {
          window.setTimeout(() => {
            onComplete(
              next.map((entry) => ({
                ...entry.card,
                reversed: entry.reversed,
              })),
            );
          }, 650);
        }
        return next;
      });
    },
    [maxCards, onComplete],
  );

  // Quick Spin & Shuffle Controls
  const handleQuickSpin = (direction: 'left' | 'right') => {
    stopMomentum();
    const impulse = direction === 'left' ? -6 : 6;
    startMomentum(impulse);
  };

  const handleShuffleDeck = () => {
    stopMomentum();
    setDeck(shuffleArray(TAROT_DECK));
    startMomentum((Math.random() - 0.5) * 12);
  };

  const handleAutoPick = () => {
    if (visibleDeck.length === 0 || selectedEntries.length >= maxCards) return;
    const randomItem = visibleDeck[Math.floor(Math.random() * visibleDeck.length)];
    if (randomItem) {
      handleSelect(randomItem.card);
    }
  };

  // High performance Pointer handling
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    stopMomentum();
    if (!containerRef.current) return;
    if (e.pointerType === 'touch') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (_) {}
    }

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2 + yOffset;

    activePointerIdRef.current = e.pointerId;
    isDraggingRef.current = false;
    hadMovedRef.current = false;
    startPointerPosRef.current = { x: e.clientX, y: e.clientY };
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    lastAngleRef.current = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId || !containerRef.current) return;

    const moveDist = Math.hypot(
      e.clientX - startPointerPosRef.current.x,
      e.clientY - startPointerPosRef.current.y,
    );

    if (!isDraggingRef.current && moveDist > 5) {
      isDraggingRef.current = true;
      hadMovedRef.current = true;
      containerRef.current.classList.add('cursor-grabbing');
      containerRef.current.classList.remove('cursor-grab');
    }

    if (!isDraggingRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2 + yOffset;
    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

    // Shortest arc unwrapped angular delta (prevents -PI to +PI snap glitches)
    let deltaAngle = currentAngle - lastAngleRef.current;
    while (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    while (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

    const deltaDeg = deltaAngle * (180 / Math.PI);
    const now = performance.now();
    const dt = Math.max(1, now - lastTimeRef.current);

    // Instant direct transform without state re-render latency
    applyRotation(rotationRef.current + deltaDeg);

    // Calculate instantaneous velocity for smooth flick release
    const instantVelocity = (deltaDeg / dt) * 16.67; // Normalize to 60fps frame rate
    velocityRef.current = velocityRef.current * 0.4 + instantVelocity * 0.6;

    lastAngleRef.current = currentAngle;
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    lastTimeRef.current = now;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;

    const wasDragging = isDraggingRef.current;
    const hadMoved = hadMovedRef.current;
    isDraggingRef.current = false;
    activePointerIdRef.current = null;

    if (containerRef.current) {
      containerRef.current.classList.remove('cursor-grabbing');
      containerRef.current.classList.add('cursor-grab');
      try {
        if (containerRef.current.hasPointerCapture(e.pointerId)) {
          containerRef.current.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
    }

    if (wasDragging) {
      // If user flicked with velocity, apply smooth momentum
      if (Math.abs(velocityRef.current) > 0.08) {
        startMomentum(velocityRef.current);
      }
    } else if (!hadMoved) {
      // Direct tap selection
      const tapped = findTappedCard(e.clientX, e.clientY);
      if (tapped !== null) {
        handleSelect(tapped);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    stopMomentum();
    const delta = (e.deltaY || e.deltaX) * 0.05;
    applyRotation(rotationRef.current + delta);
    startMomentum(delta * 0.8);
  };

  return (
    <div
      className="fixed inset-0 z-[300] bg-zinc-950 overflow-hidden flex flex-col items-center justify-between font-sans select-none"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Top Floating Close Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="absolute z-[320] px-4 py-2 min-h-[44px] min-w-[44px] rounded-full border border-yellow-500/40 bg-zinc-900/95 text-xs font-bold uppercase tracking-widest text-yellow-300 hover:text-yellow-200 hover:border-yellow-400/60 shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-md active:scale-95 transition-all flex items-center justify-center cursor-pointer pointer-events-auto"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
        }}
        aria-label="닫기"
      >
        닫기
      </button>

      {/* Main Interactive Interactive Stage */}
      <div
        ref={containerRef}
        className="flex-1 w-full relative flex items-center justify-center overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* Subtle Vignette & Depth Masking */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(9,9,11,0.6)_80%)] pointer-events-none z-[15]" />
        <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-zinc-950 via-zinc-950/70 to-transparent pointer-events-none z-[20]" />

        {/* 78-Card GPU Composited Wheel Layer - Single Hardware Composite Target */}
        <div
          ref={wheelLayerRef}
          className="absolute left-1/2 top-1/2 transition-opacity duration-300"
          style={{
            transform: buildWheelTransform(0),
            willChange: 'transform',
            transformOrigin: 'center center',
            opacity: wheelReady ? 1 : 0,
          }}
        >
          {/* Subtle concentric orbit rings */}
          <div
            className="absolute left-1/2 top-1/2 rounded-full border border-yellow-500/15 bg-[radial-gradient(circle,rgba(234,179,8,0.03)_0%,transparent_75%)] pointer-events-none"
            style={{
              width: radius * 2,
              height: radius * 2,
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 rounded-full border border-dashed border-yellow-500/20 pointer-events-none"
            style={{
              width: radius * 2 + 16,
              height: radius * 2 + 16,
              transform: 'translate(-50%, -50%)',
            }}
          />

          {visibleDeck.map(({ card, originalIdx }, positionIdx) => (
            <DeckWheelCard
              key={card.id || originalIdx}
              card={card}
              originalIdx={originalIdx}
              positionIdx={positionIdx}
              radius={radius}
              offset={cardOffsets[originalIdx] || { radOffset: 0, angleOffset: 0 }}
              isMobile={isMobile}
              totalCards={visibleDeck.length}
            />
          ))}
        </div>

        {/* Top Info Banner (Theme / Spread Meta / Question) */}
        {(hasConcern || hasSpreadMeta) && (
          <div
            className="absolute left-0 right-0 z-[96] px-4 pointer-events-none flex justify-center"
            style={{
              top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
              paddingRight: 'calc(env(safe-area-inset-right, 0px) + 72px)',
              paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 16px)',
            }}
          >
            <div className="w-full max-w-md rounded-2xl border border-yellow-500/25 bg-zinc-900/90 backdrop-blur-md px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] space-y-1.5 pointer-events-auto">
              {hasSpreadMeta && (
                <div className="text-center">
                  <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.25em] text-yellow-500/75 mb-0.5 font-mono">
                    자동 추천 배열법
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-yellow-200">
                    {spreadName} · {maxCards}장
                  </p>
                  {spreadReason && (
                    <p className="text-[9px] sm:text-[10px] text-white/50 leading-tight mt-0.5 line-clamp-1 break-keep">
                      {spreadReason}
                    </p>
                  )}
                </div>
              )}
              {hasConcern && (
                <div className="text-center border-t border-white/5 pt-1">
                  <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.25em] text-yellow-500/75 mb-0.5 font-mono">
                    나의 고민
                  </p>
                  <p className="text-[11px] sm:text-xs text-white/90 leading-tight line-clamp-2 break-keep">
                    {concernText}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Card Slots Layer */}
        <div
          className="absolute flex flex-col items-center justify-center gap-3 sm:gap-4 md:gap-6 z-[95] pointer-events-none w-full px-2"
          style={{
            top: isMobile
              ? hasConcern || hasSpreadMeta
                ? compactSlots
                  ? 'calc(env(safe-area-inset-top, 0px) + 7.2rem)'
                  : 'calc(env(safe-area-inset-top, 0px) + 6.5rem)'
                : 'calc(env(safe-area-inset-top, 0px) + 3.8rem)'
              : hasConcern || hasSpreadMeta
                ? compactSlots
                  ? 'calc(env(safe-area-inset-top, 0px) + 9.5rem)'
                  : 'calc(env(safe-area-inset-top, 0px) + 8.5rem)'
                : 'calc(env(safe-area-inset-top, 0px) + 4.5rem)',
          }}
        >
          <div className={slotsWrapClass}>
            {Array.from({ length: maxCards }).map((_, i) => {
              const entry = selectedEntries[i];
              const hasCard = entry !== undefined;
              const drawnCard = hasCard ? entry.card : null;
              const positionLabel = positions[i] || `Card ${i + 1}`;
              return (
                <div
                  key={`slot-${i}`}
                  className={`${slotClass} bg-zinc-950/80 border border-yellow-500/30 rounded-xl md:rounded-2xl flex items-center justify-center relative shadow-2xl backdrop-blur-md`}
                >
                  {!hasCard ? (
                    <div className="text-yellow-500/35 text-[7px] md:text-[9px] uppercase tracking-widest font-sans flex flex-col items-center gap-1 md:gap-1.5 px-1 text-center">
                      <div className="w-5 h-5 md:w-7 md:h-7 rounded-full border border-yellow-500/30 flex items-center justify-center bg-yellow-500/10 animate-pulse shadow-inner">
                        <span className="text-yellow-500/70 text-[8px] md:text-[10px] font-serif font-black">
                          {i + 1}
                        </span>
                      </div>
                      <span className="font-bold tracking-wide leading-tight break-keep">{positionLabel}</span>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 24 }}
                      className="absolute inset-0 border border-yellow-500/60 rounded-xl md:rounded-2xl flex flex-col justify-between p-1.5 sm:p-2 md:p-3 text-center shadow-[0_0_24px_rgba(234,179,8,0.35)] overflow-hidden animate-fade-in"
                    >
                      <img
                        src={getTarotCardImageUrl(drawnCard!)}
                        alt={drawnCard!.name}
                        loading="lazy"
                        style={{ transform: entry.reversed ? 'rotate(180deg)' : undefined }}
                        className="absolute inset-0 w-full h-full object-cover z-0 rounded-xl md:rounded-2xl opacity-90 transition-opacity duration-300 group-hover:opacity-100"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70 z-10 pointer-events-none rounded-xl md:rounded-2xl" />
                      <div className="absolute inset-0.5 border border-yellow-500/20 rounded-lg md:rounded-xl pointer-events-none z-20" />

                      <div className="flex justify-between items-center text-[6px] md:text-[7px] font-mono text-yellow-500/80 z-20 shrink-0">
                        <span>{entry.reversed ? 'REVERSED' : 'TRINITY'}</span>
                        <Sparkles size={6} className="text-yellow-400/80" />
                      </div>

                      <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 mx-auto rounded-full bg-black/60 border border-yellow-500/30 flex items-center justify-center text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)] z-20 shrink-0">
                        {React.createElement(getTarotCardVisual(drawnCard!).icon, {
                          size: isMobile ? 12 : 20,
                          className: getTarotCardVisual(drawnCard!).color,
                        })}
                      </div>

                      <div className="text-center z-20 flex flex-col gap-0.5 shrink-0 bg-black/70 py-0.5 sm:py-1 rounded-lg border border-yellow-500/20 backdrop-blur-[1px]">
                        <span className="text-[8px] sm:text-[9px] md:text-[11px] font-bold text-yellow-300 block leading-tight">
                          {drawnCard!.nameKo}
                        </span>
                        <span className="text-[5px] sm:text-[6px] md:text-[7px] font-mono text-white/50 uppercase tracking-widest block">
                          {entry.reversed ? '역방향' : drawnCard!.name}
                        </span>
                      </div>

                      <span className="text-[5px] sm:text-[6px] md:text-[7px] font-mono text-yellow-500/60 uppercase tracking-widest block z-20 shrink-0">
                        {drawnCard!.type}
                      </span>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selection Instruction and Help */}
          <div className="text-center pointer-events-none flex flex-col items-center gap-1 px-4 w-full select-none">
            <span className="text-yellow-400 font-bold tracking-[0.15em] text-xs sm:text-[13px] md:text-sm font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {selectedEntries.length} / {maxCards} 카드를 선택하세요
            </span>
            <span className="text-white/60 text-[10px] sm:text-[11px] tracking-wide font-normal max-w-xs md:max-w-md drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              부드럽게 밀어서 회전시키거나 원하는 카드를 탭하세요
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Quick Control Bar */}
      <div
        className="relative z-[310] flex items-center justify-center gap-2 sm:gap-3 px-4 py-3 bg-zinc-950/80 backdrop-blur-md border-t border-yellow-500/20 w-full"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <button
          type="button"
          onClick={() => handleQuickSpin('left')}
          className="px-3 py-2 rounded-xl bg-zinc-900 border border-yellow-500/25 hover:border-yellow-400 text-yellow-300 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer"
        >
          <ChevronLeft size={14} />
          <span>좌회전</span>
        </button>

        <button
          type="button"
          onClick={handleShuffleDeck}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-yellow-500/20 border border-yellow-500/40 hover:border-yellow-400 text-yellow-200 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer"
        >
          <Shuffle size={13} className="text-yellow-400" />
          <span>덱 셔플</span>
        </button>

        <button
          type="button"
          onClick={handleAutoPick}
          disabled={selectedEntries.length >= maxCards}
          className="px-3.5 py-2 rounded-xl bg-yellow-500 text-zinc-950 font-bold text-xs flex items-center gap-1.5 hover:bg-yellow-400 active:scale-95 transition-all shadow-[0_0_16px_rgba(234,179,8,0.4)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          <Sparkles size={13} />
          <span>자동 한 장</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickSpin('right')}
          className="px-3 py-2 rounded-xl bg-zinc-900 border border-yellow-500/25 hover:border-yellow-400 text-yellow-300 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer"
        >
          <span>우회전</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
