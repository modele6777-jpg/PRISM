import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Eye, RefreshCw, Activity, Sun, Compass,
  Flame, Heart, Wind, Coins, ShieldCheck, BookOpen, Zap, Star, Moon,
} from 'lucide-react';
import { TAROT_DECK, TarotCard, getTarotCardImageUrl, rollTarotReversed } from '../../data/tarotData';

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
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
  if (card.id?.startsWith('swords_')) return { icon: Wind, color: 'text-purple-450' };
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
    major_13: { icon: Activity, color: 'text-purple-600' },
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
  wheelReady: boolean;
  totalCards: number;
};

const DeckWheelCard = React.memo(function DeckWheelCard({
  card: _card,
  originalIdx: _originalIdx,
  positionIdx,
  radius,
  offset,
  isMobile,
  wheelReady,
  totalCards,
}: DeckWheelCardProps) {
  // Distribute cards evenly along the full 360 degree wheel
  const step = (2 * Math.PI) / totalCards;
  const localAngle = positionIdx * step + offset.angleOffset;
  const finalRadius = radius + offset.radOffset;
  const cardRotate = (localAngle * 180) / Math.PI + 90;
  const x = finalRadius * Math.cos(localAngle);
  const y = finalRadius * Math.sin(localAngle);

  return (
    <div
      className="absolute left-1/2 top-1/2 w-18 h-28 md:w-28 md:h-44 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 rounded-xl md:rounded-2xl border border-yellow-500/30 shadow-2xl flex items-center justify-center group pointer-events-none select-none"
      style={{
        transform: `translate3d(-50%, -50%, 0) translate3d(${x}px, ${y}px, 0) rotate(${cardRotate}deg) scale(${wheelReady ? 1 : 0.2})`,
        opacity: wheelReady ? 1 : 0,
        transformOrigin: 'center center',
        zIndex: 10 + (positionIdx % 50),
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
    >
      <div className="absolute inset-1.5 border border-yellow-500/10 rounded-lg md:rounded-xl pointer-events-none" />
      <div className="absolute inset-1 border border-yellow-500/20 rounded-lg md:rounded-xl flex flex-col items-center justify-center bg-yellow-500/5 transition-colors shadow-inner relative overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(234,179,8,0.02)_0%,transparent_60%)]" />
        <div className="absolute w-full h-[1px] bg-yellow-500/10" />
        <div className="absolute h-full w-[1px] bg-yellow-500/10" />
        <div className="absolute w-12 h-12 md:w-16 md:h-16 rounded-full border border-yellow-500/10" />
        <div className="absolute w-8 h-8 md:w-11 md:h-11 rounded-full border border-dashed border-yellow-500/15" />
        <div className="w-8 h-8 md:w-11 md:h-11 rounded-full border border-yellow-500/30 flex items-center justify-center bg-black/60 shadow-md relative z-10">
          <Sparkles
            className="text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]"
            size={isMobile ? 12 : 18}
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
  const deck = useMemo(() => shuffleArray(TAROT_DECK), []);
  const cardOffsets = useMemo(
    () =>
      Array.from({ length: 78 }).map(() => ({
        radOffset: (Math.random() - 0.5) * 4,
        angleOffset: (Math.random() - 0.5) * 0.005,
      })),
    [],
  );

  const [selectedEntries, setSelectedEntries] = useState<Array<{ index: number; reversed: boolean }>>([]);
  const selectedIndices = useMemo(
    () => selectedEntries.map((entry) => entry.index),
    [selectedEntries],
  );
  const [wheelReady, setWheelReady] = useState(false);
  const [radius, setRadius] = useState(640);
  const [yOffset, setYOffset] = useState(500);
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const wheelLayerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const dragStartAngleRef = useRef(0);
  const dragStartRotationRef = useRef(0);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const hadDraggedRef = useRef(false);
  const rotationRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const buildWheelTransform = useCallback(
    (deg: number) => `translate3d(-50%, calc(-50% + ${yOffset}px), 0) rotate(${deg}deg)`,
    [yOffset],
  );

  const paintWheelRotation = useCallback(
    (deg: number) => {
      rotationRef.current = deg;
      if (!wheelLayerRef.current) return;
      wheelLayerRef.current.style.transform = buildWheelTransform(deg);
    },
    [buildWheelTransform],
  );

  const releasePointerSession = useCallback((pointerId?: number) => {
    if (
      pointerId !== undefined &&
      activePointerIdRef.current !== null &&
      activePointerIdRef.current !== pointerId
    ) {
      return;
    }

    const el = containerRef.current;
    if (el && pointerId !== undefined) {
      try {
        if (el.hasPointerCapture(pointerId)) {
          el.releasePointerCapture(pointerId);
        }
      } catch {
        // pointer may already be released
      }
    }

    isDraggingRef.current = false;
    activePointerIdRef.current = null;
  }, []);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      releasePointerSession(activePointerIdRef.current ?? undefined);
    },
    [releasePointerSession],
  );

  useEffect(() => {
    if (!isDraggingRef.current) {
      paintWheelRotation(rotationRef.current);
    }
  }, [paintWheelRotation, yOffset]);

  useEffect(() => {
    const updateRadius = () => {
      const w = window.innerWidth;
      if (w < 480) {
        setRadius(350);
        setYOffset(420);
        setIsMobile(true);
      } else if (w < 768) {
        setRadius(420);
        setYOffset(500);
        setIsMobile(true);
      } else {
        setRadius(580);
        setYOffset(685);
        setIsMobile(false);
      }
    };

    updateRadius();
    let resizeTimer: number | undefined;
    const onResize = () => {
      if (isDraggingRef.current) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updateRadius, 150);
    };
    window.addEventListener('resize', onResize);
    const timer = window.setTimeout(() => {
      updateRadius();
      requestAnimationFrame(() => setWheelReady(true));
    }, 100);

    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(timer);
      if (resizeTimer !== undefined) window.clearTimeout(resizeTimer);
    };
  }, []);

  const visibleDeck = useMemo(
    () =>
      deck
        .map((card, originalIdx) => ({ card, originalIdx }))
        .filter(({ originalIdx }) => !selectedIndices.includes(originalIdx)),
    [deck, selectedIndices],
  );

  const findTappedCard = useCallback(
    (clientX: number, clientY: number): number | null => {
      if (!containerRef.current || visibleDeck.length === 0) return null;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2 + yOffset;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);
      const band = isMobile ? 120 : 150;

      if (dist < radius - band || dist > radius + band) return null;

      const pointerAngle = Math.atan2(dy, dx);
      const rotationRad = (rotationRef.current * Math.PI) / 180;
      let localAngle = pointerAngle - rotationRad;
      while (localAngle > Math.PI) localAngle -= 2 * Math.PI;
      while (localAngle < -Math.PI) localAngle += 2 * Math.PI;

      let bestIdx: number | null = null;
      let bestDiff = Infinity;
      const step = (2 * Math.PI) / visibleDeck.length;

      visibleDeck.forEach(({ originalIdx }, positionIdx) => {
        const cardAngle =
          positionIdx * step + (cardOffsets[originalIdx]?.angleOffset ?? 0);
        let diff = Math.abs(localAngle - cardAngle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = originalIdx;
        }
      });

      return bestDiff < 0.25 ? bestIdx : null;
    },
    [cardOffsets, isMobile, radius, visibleDeck, yOffset],
  );

  const handleSelect = useCallback(
    (index: number) => {
      setSelectedEntries((prev) => {
        if (prev.some((entry) => entry.index === index) || prev.length >= maxCards) return prev;
        const next = [...prev, { index, reversed: rollTarotReversed() }];
        if (next.length === maxCards) {
          window.setTimeout(() => {
            onComplete(
              next.map((entry) => ({
                ...deck[entry.index],
                reversed: entry.reversed,
              })),
            );
          }, 700);
        }
        return next;
      });
    },
    [deck, maxCards, onComplete],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    if (e.pointerType === 'touch') e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2 + yOffset;

    activePointerIdRef.current = e.pointerId;
    isDraggingRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    hadDraggedRef.current = false;
    dragStartAngleRef.current = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    dragStartRotationRef.current = rotationRef.current;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId || !containerRef.current) return;
    if (e.pointerType === 'touch') e.preventDefault();

    const distance = Math.hypot(
      e.clientX - dragStartPosRef.current.x,
      e.clientY - dragStartPosRef.current.y,
    );

    if (!isDraggingRef.current && distance > 4) {
      isDraggingRef.current = true;
      hadDraggedRef.current = true;
      containerRef.current.classList.add('cursor-grabbing');
      containerRef.current.classList.remove('cursor-grab');
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore capture errors
      }
    }

    if (!isDraggingRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2 + yOffset;
    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const deltaAngle = currentAngle - dragStartAngleRef.current;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      paintWheelRotation(dragStartRotationRef.current + deltaAngle * (180 / Math.PI));
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;

    const wasDragging = isDraggingRef.current;
    const dragged = hadDraggedRef.current;
    releasePointerSession(e.pointerId);
    containerRef.current?.classList.remove('cursor-grabbing');
    containerRef.current?.classList.add('cursor-grab');

    if (!wasDragging && !dragged) {
      const tapped = findTappedCard(e.clientX, e.clientY);
      if (tapped !== null) {
        handleSelect(tapped);
      }
    }
  };

  const handleLostPointerCapture = () => {
    isDraggingRef.current = false;
    activePointerIdRef.current = null;
    containerRef.current?.classList.remove('cursor-grabbing');
    containerRef.current?.classList.add('cursor-grab');
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    paintWheelRotation(rotationRef.current + e.deltaY * 0.08);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (hadDraggedRef.current) {
      hadDraggedRef.current = false;
      return;
    }
    if (containerRef.current?.contains(e.target as Node)) {
      return;
    }
    onCancel();
  };

  return (
    <div
      onClick={handleBackgroundClick}
      className="fixed inset-0 z-[300] bg-zinc-950 overflow-hidden flex flex-col items-center justify-between font-sans select-none"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Top Floating Close Button - Guaranteed above Notch on iPhone XS */}
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

      <div
        ref={containerRef}
        className="flex-1 w-full relative flex items-center justify-center overflow-hidden touch-none select-none cursor-grab"
        style={{ touchAction: 'none' }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={handleLostPointerCapture}
        onWheel={handleWheel}
      >
        {/* Arc Masking & Vignette to highlight top cards cleanly with 0 CPU overhead */}
        <div className="absolute inset-0 bg-radial-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none z-[15]" />
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-zinc-950 via-zinc-950/60 to-transparent pointer-events-none z-[20]" />

        {/* 78-Card GPU Accelerated Wheel Layer */}
        <div
          ref={wheelLayerRef}
          className="absolute left-1/2 top-1/2"
          style={{
            transform: buildWheelTransform(0),
            willChange: 'transform',
            transformOrigin: 'center center',
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 rounded-full border border-yellow-500/10 bg-[radial-gradient(circle,rgba(234,179,8,0.02)_0%,transparent_70%)] pointer-events-none"
            style={{
              width: radius * 2,
              height: radius * 2,
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 rounded-full border border-dashed border-yellow-500/15 pointer-events-none"
            style={{
              width: radius * 2,
              height: radius * 2,
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
              wheelReady={wheelReady}
              totalCards={visibleDeck.length}
            />
          ))}
        </div>

        {/* Top Info Banner (Theme / Spread Meta / Question) */}
        {(hasConcern || hasSpreadMeta) && (
          <div
            onClick={(e) => e.stopPropagation()}
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
          onClick={(e) => e.stopPropagation()}
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
              const drawnCard = hasCard ? deck[entry.index] : null;
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
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      className="absolute inset-0 border border-yellow-500/60 rounded-xl md:rounded-2xl flex flex-col justify-between p-1.5 sm:p-2 md:p-3 text-center shadow-[0_0_20px_rgba(234,179,8,0.3)] overflow-hidden animate-fade-in"
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
            <span className="text-white/50 text-[9px] sm:text-[10px] tracking-wide font-normal max-w-xs md:max-w-md drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              원을 드래그하거나 회전시켜 78장 카드 중 마음에 드는 카드를 탭하세요
            </span>
          </div>
        </div>
      </div>

      <div
        className="pb-4 pointer-events-none"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      />
    </div>
  );
};