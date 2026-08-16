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

function computeArcOpacity(finalAngle: number): number {
  let normalizedAngle = finalAngle % (2 * Math.PI);
  if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
  if (normalizedAngle > Math.PI) normalizedAngle -= 2 * Math.PI;

  const topPoint = -Math.PI / 2;
  let angleDiff = normalizedAngle - topPoint;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  angleDiff = Math.abs(angleDiff);

  const maxVisibleDiff = Math.PI * 0.54;
  const fadeZone = Math.PI * 0.1;
  if (angleDiff >= maxVisibleDiff) return 0;
  if (angleDiff < maxVisibleDiff - fadeZone) return 1;
  return (maxVisibleDiff - angleDiff) / fadeZone;
}

type DeckWheelCardProps = {
  card: TarotCard;
  originalIdx: number;
  positionIdx: number;
  wheelRotation: number;
  radius: number;
  offset: { radOffset: number; angleOffset: number };
  isMobile: boolean;
  wheelReady: boolean;
  hoveredIdx: number | null;
  onHover: (idx: number | null) => void;
};

const DeckWheelCard = React.memo(function DeckWheelCard({
  card,
  originalIdx,
  positionIdx,
  wheelRotation,
  radius,
  offset,
  isMobile,
  wheelReady,
  hoveredIdx,
  onHover,
}: DeckWheelCardProps) {
  const localAngle = positionIdx * (Math.PI / 26) + offset.angleOffset;
  const screenAngle = localAngle + (wheelRotation * Math.PI) / 180;
  const finalRadius = radius + offset.radOffset;
  const arcOpacity = computeArcOpacity(screenAngle);

  if (arcOpacity < 0.05) return null;

  const isHovered = hoveredIdx === originalIdx;
  const currentRadius = isHovered ? finalRadius + 45 : finalRadius;
  const currentScale = isHovered ? 1.4 : wheelReady ? 1 : 0.12;
  const cardRotate = (localAngle * 180) / Math.PI + 90;
  const hoverBaseOpacity = hoveredIdx === null ? 1 : isHovered ? 1 : 0.35;
  const currentOpacity = (wheelReady ? 1 : 0) * arcOpacity * hoverBaseOpacity;
  const x = currentRadius * Math.cos(localAngle);
  const y = currentRadius * Math.sin(localAngle);

  const introDelay = positionIdx * (isMobile ? 0.001 : 0.003);
  const transition = wheelReady
    ? 'transform 0.28s ease, opacity 0.12s ease'
    : `transform 0.45s ease ${introDelay}s, opacity 0.35s ease ${introDelay}s`;

  return (
    <div
      onMouseEnter={() => onHover(originalIdx)}
      onMouseLeave={() => onHover(null)}
      className="absolute left-1/2 top-1/2 w-18 h-28 md:w-28 md:h-44 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 rounded-xl md:rounded-2xl border border-yellow-500/30 shadow-2xl flex items-center justify-center hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(234,179,8,0.25)] group pointer-events-none"
      style={{
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${cardRotate}deg) scale(${currentScale})`,
        opacity: currentOpacity,
        transformOrigin: 'center center',
        zIndex: isHovered ? 1000 : 10 + positionIdx,
        transition,
      }}
    >
      <div className="absolute inset-1.5 border border-yellow-500/10 rounded-lg md:rounded-xl pointer-events-none" />
      <div className="absolute inset-1 border border-yellow-500/20 rounded-lg md:rounded-xl flex flex-col items-center justify-center bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-all shadow-inner relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(234,179,8,0.02)_0%,transparent_60%)]" />
        <div className="absolute w-full h-[1px] bg-yellow-500/10" />
        <div className="absolute h-full w-[1px] bg-yellow-500/10" />
        <div className="absolute w-12 h-12 md:w-16 md:h-16 rounded-full border border-yellow-500/10" />
        <div className="absolute w-8 h-8 md:w-11 md:h-11 rounded-full border border-dashed border-yellow-500/15" />
        <div className="w-8 h-8 md:w-11 md:h-11 rounded-full border border-yellow-500/30 flex items-center justify-center bg-black/60 shadow-md relative z-10">
          <Sparkles
            className="text-yellow-400 group-hover:scale-115 transition-all duration-300 shadow-[0_0_12px_rgba(234,179,8,0.6)]"
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
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
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
  const wheelRafRef = useRef<number | null>(null);
  const pendingWheelRotationRef = useRef<number | null>(null);

  const buildWheelTransform = useCallback(
    (deg: number) => `translate(-50%, calc(-50% + ${yOffset}px)) rotate(${deg}deg)`,
    [yOffset],
  );

  const paintWheelRotation = useCallback(
    (deg: number, animate = true) => {
      rotationRef.current = deg;
      if (!wheelLayerRef.current) return;
      wheelLayerRef.current.style.transition = animate ? 'transform 80ms linear' : 'none';
      wheelLayerRef.current.style.transform = buildWheelTransform(deg);
    },
    [buildWheelTransform],
  );

  const commitWheelRotation = useCallback(
    (deg: number, animate = true) => {
      paintWheelRotation(deg, animate);
      setWheelRotation(deg);
    },
    [paintWheelRotation],
  );

  const scheduleWheelRotation = useCallback(
    (next: number) => {
      pendingWheelRotationRef.current = next;
      if (wheelRafRef.current !== null) return;
      wheelRafRef.current = window.requestAnimationFrame(() => {
        wheelRafRef.current = null;
        const pending = pendingWheelRotationRef.current;
        if (pending === null) return;
        pendingWheelRotationRef.current = null;
        commitWheelRotation(pending);
      });
    },
    [commitWheelRotation],
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

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      commitWheelRotation(rotationRef.current);
    }
    activePointerIdRef.current = null;
  }, [commitWheelRotation]);

  useEffect(
    () => () => {
      if (wheelRafRef.current !== null) window.cancelAnimationFrame(wheelRafRef.current);
      releasePointerSession(activePointerIdRef.current ?? undefined);
    },
    [releasePointerSession],
  );

  useEffect(() => {
    if (!isDraggingRef.current) {
      paintWheelRotation(wheelRotation);
    }
  }, [paintWheelRotation, wheelRotation, yOffset]);

  useEffect(() => {
    const updateRadius = () => {
      const w = window.innerWidth;
      if (w < 480) {
        setRadius(360);
        setYOffset(425);
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
      resizeTimer = window.setTimeout(updateRadius, 200);
    };
    window.addEventListener('resize', onResize);
    const timer = window.setTimeout(() => {
      updateRadius();
      requestAnimationFrame(() => setWheelReady(true));
    }, 150);

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
      if (!containerRef.current) return null;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2 + yOffset;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);
      const band = isMobile ? 110 : 140;

      if (dist < radius - band || dist > radius + band) return null;

      const pointerAngle = Math.atan2(dy, dx);
      const rotationRad = (rotationRef.current * Math.PI) / 180;
      let localAngle = pointerAngle - rotationRad;
      while (localAngle > Math.PI) localAngle -= 2 * Math.PI;
      while (localAngle < -Math.PI) localAngle += 2 * Math.PI;

      let bestIdx: number | null = null;
      let bestDiff = Infinity;

      visibleDeck.forEach(({ originalIdx }, positionIdx) => {
        const cardAngle =
          positionIdx * (Math.PI / 26) + (cardOffsets[originalIdx]?.angleOffset ?? 0);
        let diff = Math.abs(localAngle - cardAngle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        const screenAngle = cardAngle + rotationRad;
        if (computeArcOpacity(screenAngle) < 0.2) return;
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = originalIdx;
        }
      });

      return bestDiff < 0.22 ? bestIdx : null;
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
    setHoveredIdx(null);
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

    if (!isDraggingRef.current && distance > 5) {
      isDraggingRef.current = true;
      hadDraggedRef.current = true;
      containerRef.current.classList.add('cursor-grabbing');
      containerRef.current.classList.remove('cursor-grab');
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    if (!isDraggingRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2 + yOffset;
    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const deltaAngle = currentAngle - dragStartAngleRef.current;
    paintWheelRotation(
      dragStartRotationRef.current + deltaAngle * (180 / Math.PI),
      false,
    );
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
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      commitWheelRotation(rotationRef.current);
    }
    activePointerIdRef.current = null;
    containerRef.current?.classList.remove('cursor-grabbing');
    containerRef.current?.classList.add('cursor-grab');
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    scheduleWheelRotation(rotationRef.current + e.deltaY * 0.05);
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
      className="fixed inset-0 z-[250] bg-zinc-950 overflow-hidden flex flex-col items-center justify-between font-sans"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="absolute top-4 right-4 z-[260] px-3 py-1.5 rounded-full border border-yellow-500/25 bg-zinc-900/80 text-[10px] font-bold uppercase tracking-widest text-yellow-400/80 hover:text-yellow-300 hover:border-yellow-500/40 transition-colors"
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
        <div className="absolute inset-0 bg-radial-gradient-to-b from-transparent to-black/20 pointer-events-none" />
        <div
          ref={wheelLayerRef}
          className="absolute left-1/2 top-1/2"
          style={{
            transform: buildWheelTransform(wheelRotation),
            transition: 'transform 80ms linear',
            willChange: 'transform',
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 rounded-full border border-yellow-500/5 bg-[radial-gradient(circle,rgba(234,179,8,0.01)_0%,transparent_70%)] pointer-events-none"
            style={{
              width: radius * 2,
              height: radius * 2,
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 rounded-full border border-dashed border-yellow-500/10 pointer-events-none"
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
              wheelRotation={wheelRotation}
              radius={radius}
              offset={cardOffsets[originalIdx] || { radOffset: 0, angleOffset: 0 }}
              isMobile={isMobile}
              wheelReady={wheelReady}
              hoveredIdx={hoveredIdx}
              onHover={setHoveredIdx}
            />
          ))}
        </div>

        {(hasConcern || hasSpreadMeta) && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 right-0 z-[96] px-4 pointer-events-none"
            style={{ top: isMobile ? '0.75rem' : '1.25rem' }}
          >
            <div className="mx-auto max-w-lg rounded-2xl border border-yellow-500/25 bg-zinc-900 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] space-y-2">
              {hasSpreadMeta && (
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-yellow-500/75 mb-1">
                    자동 추천 배열법
                  </p>
                  <p className="text-xs md:text-sm font-bold text-yellow-200">
                    {spreadName} · {maxCards}장
                  </p>
                  {spreadReason && (
                    <p className="text-[10px] text-white/45 leading-relaxed mt-1 break-keep">
                      {spreadReason}
                    </p>
                  )}
                </div>
              )}
              {hasConcern && (
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-yellow-500/75 mb-1.5">
                    나의 고민
                  </p>
                  <p className="text-xs md:text-sm text-white/90 leading-relaxed line-clamp-3 break-keep">
                    {concernText}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute flex flex-col items-center justify-center gap-4 md:gap-6 z-[95] pointer-events-none w-full"
          style={{
            top: isMobile
              ? hasConcern || hasSpreadMeta ? (compactSlots ? '8.5rem' : '7.5rem') : '40px'
              : hasConcern || hasSpreadMeta ? (compactSlots ? '12.5rem' : '11rem') : '75px',
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
                  className={`${slotClass} bg-zinc-950/70 border border-yellow-500/20 rounded-xl md:rounded-2xl flex items-center justify-center relative shadow-2xl backdrop-blur-md`}
                >
                  {!hasCard ? (
                    <div className="text-yellow-500/25 text-[7px] md:text-[9px] uppercase tracking-widest font-sans flex flex-col items-center gap-1 md:gap-1.5 px-1 text-center">
                      <div className="w-5 h-5 md:w-7 md:h-7 rounded-full border border-yellow-500/20 flex items-center justify-center bg-yellow-500/5 animate-pulse shadow-inner">
                        <span className="text-yellow-500/50 text-[8px] md:text-[10px] font-serif font-black">
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
                      className="absolute inset-0 border border-yellow-500/60 rounded-xl md:rounded-2xl flex flex-col justify-between p-2 md:p-3 text-center shadow-[0_0_20px_rgba(234,179,8,0.25)] overflow-hidden animate-fade-in"
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

                      <div className="w-7 h-7 md:w-9 md:h-9 mx-auto rounded-full bg-black/50 border border-yellow-500/20 flex items-center justify-center text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)] z-20 shrink-0">
                        {React.createElement(getTarotCardVisual(drawnCard!).icon, {
                          size: isMobile ? 14 : 20,
                          className: getTarotCardVisual(drawnCard!).color,
                        })}
                      </div>

                      <div className="text-center z-20 flex flex-col gap-0.5 shrink-0 bg-black/60 py-1 rounded-lg border border-yellow-500/10 backdrop-blur-[1px]">
                        <span className="text-[9px] md:text-[11px] font-bold text-yellow-300 block leading-tight">
                          {drawnCard!.nameKo}
                        </span>
                        <span className="text-[6px] md:text-[7px] font-mono text-white/40 uppercase tracking-widest block">
                          {entry.reversed ? '역방향' : drawnCard!.name}
                        </span>
                      </div>

                      <span className="text-[6px] md:text-[7px] font-mono text-yellow-500/50 uppercase tracking-widest block z-20 shrink-0">
                        {drawnCard!.type}
                      </span>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center pointer-events-none flex flex-col items-center gap-1 md:gap-1.5 px-4 w-full select-none">
            <span className="text-yellow-500 font-bold tracking-[0.15em] text-[13px] md:text-sm font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {selectedEntries.length} / {maxCards} 카드를 선택하세요
            </span>
            <span className="text-white/40 text-[9px] md:text-[10px] tracking-wide font-normal max-w-xs md:max-w-md drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              원을 드래그하거나 마우스 휠을 돌려 78장 카드 데크를 회전시킬 수 있습니다
            </span>
          </div>
        </div>
      </div>

      <div className="pb-8 pointer-events-none" />
    </div>
  );
};