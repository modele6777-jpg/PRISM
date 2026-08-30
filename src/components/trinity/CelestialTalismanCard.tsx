import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Download,
  Copy,
  Check,
  RotateCw,
  Zap,
  Shield,
  Flame,
} from 'lucide-react';
import { TTSButton } from '@/components/TTSButton';
import { type SajuAnalysisResult } from '@/lib/sajuAnalysis';

interface CelestialTalismanCardProps {
  userName: string;
  todayKey: string;
  saju: SajuAnalysisResult | null;
  luckyData: {
    luckScore?: number;
    luckLevelTitle?: string;
    luckyColor?: string;
    luckyColorHex?: string;
    dailyAmuletBlessing?: string;
    goldenKey?: string;
    miracleCloverMessage?: string;
  };
}

export function CelestialTalismanCard({
  userName,
  todayKey,
  saju,
  luckyData,
}: CelestialTalismanCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEmpowered, setIsEmpowered] = useState(false);
  const [isEmpowering, setIsEmpowering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const dayMaster = saju?.dayMaster?.korean || '갑목';

  // Draw authentic Korean Mulberry Hanji & Cinnabar Talisman on Canvas
  const drawTalisman = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;

    // --- 1. Ancient Mulberry Hanji Paper Background (괴황지) ---
    const bgGrad = ctx.createLinearGradient(0, 0, cw, ch);
    bgGrad.addColorStop(0, '#f7d768');
    bgGrad.addColorStop(0.2, '#f3cb52');
    bgGrad.addColorStop(0.5, '#e5b736');
    bgGrad.addColorStop(0.8, '#c99320');
    bgGrad.addColorStop(1, '#9b6b12');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cw, ch);

    // Vignette burned shadow around borders
    const vigGrad = ctx.createRadialGradient(cw / 2, ch / 2, 100, cw / 2, ch / 2, ch * 0.62);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(0.65, 'rgba(110, 68, 12, 0.18)');
    vigGrad.addColorStop(1, 'rgba(56, 32, 4, 0.55)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, cw, ch);

    // Fine Mulberry silk fibers
    ctx.save();
    for (let i = 0; i < 180; i++) {
      const sx = (Math.sin(i * 733) * 0.5 + 0.5) * cw;
      const sy = (Math.cos(i * 293) * 0.5 + 0.5) * ch;
      const length = 10 + Math.abs(Math.sin(i * 13)) * 24;
      const angle = i * 2.1;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 252, 235, 0.45)' : 'rgba(140, 90, 20, 0.16)';
      ctx.lineWidth = 0.6 + Math.abs(Math.sin(i)) * 0.8;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(angle) * length, sy + Math.sin(angle) * length);
      ctx.stroke();
    }

    // Bark chip speckles
    for (let j = 0; j < 40; j++) {
      const x = Math.abs(Math.sin(j * 439)) * (cw - 60) + 30;
      const y = Math.abs(Math.cos(j * 115)) * (ch - 60) + 30;
      const r = 0.8 + Math.abs(Math.sin(j)) * 1.5;
      ctx.fillStyle = j % 3 === 0 ? 'rgba(68, 40, 10, 0.35)' : 'rgba(80, 50, 15, 0.18)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // --- 2. Sacred Dual Cinnabar Border (천원지방 2중 주사 테두리) ---
    ctx.save();
    ctx.strokeStyle = '#a61c1c';
    ctx.lineWidth = 5;
    ctx.strokeRect(22, 22, cw - 44, ch - 44);

    ctx.strokeStyle = '#c42323';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, cw - 60, ch - 60);

    // Corner Auspicious Ornaments
    const drawCorner = (cx: number, cy: number, rot: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.strokeStyle = '#991818';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-12, -12);
      ctx.lineTo(0, -12);
      ctx.lineTo(0, 0);
      ctx.lineTo(-12, 0);
      ctx.stroke();
      ctx.restore();
    };
    drawCorner(38, 38, 0);
    drawCorner(cw - 38, 38, Math.PI / 2);
    drawCorner(cw - 38, ch - 38, Math.PI);
    drawCorner(38, ch - 38, -Math.PI / 2);
    ctx.restore();

    // --- 3. Cinnabar Brush Stroke Function ---
    const drawCinnabarStroke = (drawFn: () => void, width: number, alpha = 0.95) => {
      ctx.save();
      // Halo diffusion
      ctx.strokeStyle = `rgba(180, 30, 30, ${alpha * 0.25})`;
      ctx.lineWidth = width + 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawFn();

      // Deep cinnabar core
      ctx.strokeStyle = `rgba(165, 20, 20, ${alpha})`;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawFn();

      // Sharp inner crimson vein
      ctx.strokeStyle = `rgba(220, 40, 40, ${alpha * 0.9})`;
      ctx.lineWidth = Math.max(1.5, width * 0.4);
      drawFn();
      ctx.restore();
    };

    // --- 4. Top Crown: Celestial Sigil (태을천존 / 천부수호관) ---
    ctx.save();
    ctx.font = 'bold 22px "Noto Serif KR", serif';
    ctx.fillStyle = '#9e1818';
    ctx.textAlign = 'center';
    ctx.fillText('勅令', cw / 2, 70); // Imperial Decree
    ctx.font = 'bold 15px "Noto Serif KR", serif';
    ctx.fillText('天上大吉 開運守護', cw / 2, 95);

    // Three Cosmic Star Points (삼태성)
    [-30, 0, 30].forEach((ox) => {
      ctx.fillStyle = '#8f1515';
      ctx.beginPath();
      ctx.arc(cw / 2 + ox, 114, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // --- 5. Main Body: Mystical Talismanic Calligraphy (영험한 부적 중심 필획) ---
    // Upper Sigil Arch
    drawCinnabarStroke(() => {
      ctx.beginPath();
      ctx.moveTo(cw / 2 - 80, 145);
      ctx.bezierCurveTo(cw / 2 - 40, 125, cw / 2 + 40, 125, cw / 2 + 80, 145);
      ctx.lineTo(cw / 2, 175);
      ctx.lineTo(cw / 2 - 80, 145);
      ctx.stroke();
    }, 4);

    // Center Mystical Character: 萬福雲集 & 百邪退散 융합 상형 부적
    drawCinnabarStroke(() => {
      ctx.beginPath();
      // Center vertical lightning spine
      ctx.moveTo(cw / 2, 175);
      ctx.lineTo(cw / 2, 230);
      ctx.lineTo(cw / 2 - 40, 245);
      ctx.lineTo(cw / 2 + 40, 260);
      ctx.lineTo(cw / 2 - 50, 280);
      ctx.lineTo(cw / 2 + 50, 300);
      ctx.lineTo(cw / 2, 330);
      ctx.lineTo(cw / 2, 420);
      ctx.stroke();
    }, 5);

    // Left Wing: Water & Wood Flow (수목생화)
    drawCinnabarStroke(() => {
      ctx.beginPath();
      ctx.moveTo(cw / 2 - 20, 210);
      ctx.bezierCurveTo(cw / 2 - 75, 230, cw / 2 - 85, 310, cw / 2 - 35, 340);
      ctx.bezierCurveTo(cw / 2 - 15, 355, cw / 2 - 25, 390, cw / 2 - 60, 405);
      ctx.stroke();
    }, 3.5);

    // Right Wing: Gold & Fire Power (금화합덕)
    drawCinnabarStroke(() => {
      ctx.beginPath();
      ctx.moveTo(cw / 2 + 20, 210);
      ctx.bezierCurveTo(cw / 2 + 75, 230, cw / 2 + 85, 310, cw / 2 + 35, 340);
      ctx.bezierCurveTo(cw / 2 + 15, 355, cw / 2 + 25, 390, cw / 2 + 60, 405);
      ctx.stroke();
    }, 3.5);

    // Four-Leaf Miracle Clover Sigil in Center
    drawCinnabarStroke(() => {
      ctx.beginPath();
      const cx = cw / 2;
      const cy = 345;
      // 4 Petals
      ctx.arc(cx - 10, cy - 10, 8, 0, Math.PI * 2);
      ctx.arc(cx + 10, cy - 10, 8, 0, Math.PI * 2);
      ctx.arc(cx - 10, cy + 10, 8, 0, Math.PI * 2);
      ctx.arc(cx + 10, cy + 10, 8, 0, Math.PI * 2);
      ctx.stroke();
    }, 2.5);

    // Bottom Triple Ring Anchor (삼재소멸 3연륜)
    drawCinnabarStroke(() => {
      ctx.beginPath();
      ctx.arc(cw / 2 - 35, 450, 14, 0, Math.PI * 2);
      ctx.arc(cw / 2, 460, 16, 0, Math.PI * 2);
      ctx.arc(cw / 2 + 35, 450, 14, 0, Math.PI * 2);
      ctx.moveTo(cw / 2 - 55, 475);
      ctx.lineTo(cw / 2 + 55, 475);
      ctx.moveTo(cw / 2, 475);
      ctx.lineTo(cw / 2, 510);
      ctx.stroke();
    }, 4);

    // --- 6. Personal Inscription: User Name & Today Date (소원자 각인) ---
    ctx.save();
    ctx.font = 'bold 13px "Noto Serif KR", serif';
    ctx.fillStyle = '#7a1212';
    ctx.textAlign = 'center';
    ctx.fillText(`${userName} 님 保命安寧`, cw / 2, 535);

    ctx.font = '11px "Noto Serif KR", serif';
    ctx.fillStyle = '#8a2525';
    ctx.fillText(`丙午年 ${todayKey} 天運 守護`, cw / 2, 555);
    ctx.restore();

    // --- 7. Red Vermilion Official Seal Stamps (주사 직인 낙관) ---
    // Bottom-Left Seal: 天符大吉
    ctx.save();
    ctx.strokeStyle = '#a81313';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, ch - 85, 40, 40);
    ctx.fillStyle = 'rgba(168, 19, 19, 0.12)';
    ctx.fillRect(48, ch - 85, 40, 40);
    ctx.font = 'bold 12px "Noto Serif KR", serif';
    ctx.fillStyle = '#9e1010';
    ctx.textAlign = 'center';
    ctx.fillText('天符', 68, ch - 68);
    ctx.fillText('大吉', 68, ch - 52);

    // Bottom-Right Seal: 三才守護
    ctx.strokeRect(cw - 88, ch - 85, 40, 40);
    ctx.fillStyle = 'rgba(168, 19, 19, 0.12)';
    ctx.fillRect(cw - 88, ch - 85, 40, 40);
    ctx.fillText('三才', cw - 68, ch - 68);
    ctx.fillText('守護', cw - 68, ch - 52);
    ctx.restore();
  }, [userName, todayKey]);

  useEffect(() => {
    drawTalisman();
  }, [drawTalisman]);

  // Handle Empower / 점안
  const handleEmpower = () => {
    if (isEmpowering) return;
    setIsEmpowering(true);
    setIsEmpowered(true);
    setTimeout(() => setIsEmpowering(false), 2500);
  };

  // Handle Download Talisman as Image
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    try {
      const imageUri = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `TRINITY_천상수호부적_${userName}_${todayKey}.png`;
      link.href = imageUri;
      link.click();
    } catch (err) {
      console.warn('Failed to download amulet image:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Handle Copy Mantra
  const handleCopy = () => {
    navigator.clipboard.writeText(
      `[트리니티 천상 수호 부적]\n👤 소원자: ${userName}\n📅 날짜: ${todayKey}\n✨ 축원: ${luckyData.dailyAmuletBlessing}\n🔑 개운 비법: ${luckyData.goldenKey}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full flex flex-col items-center space-y-6 animate-fade-in font-sans">
      {/* 3D Talisman Card Container */}
      <div className="relative w-full max-w-sm" style={{ perspective: '1200px' }}>
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 85, damping: 14 }}
          className="relative w-full h-[580px] sm:h-[620px] cursor-pointer"
          style={{ transformStyle: 'preserve-3d' }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* ================= FRONT: Real Sacred Talisman Canvas ================= */}
          <div
            className="absolute inset-0 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.4)] border border-yellow-500/50 flex flex-col items-center justify-between p-3.5 bg-zinc-950 group"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            {/* Luminous Glow when Empowered */}
            {isEmpowered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 bg-yellow-400/20 blur-xl pointer-events-none z-20"
              />
            )}

            {/* Canvas of the Real Amulet */}
            <div className="relative w-full h-full rounded-[24px] overflow-hidden shadow-2xl border border-yellow-600/40">
              <canvas
                ref={canvasRef}
                width={360}
                height={580}
                className="w-full h-full object-cover select-none pointer-events-none"
              />

              {/* Specular Silk Gold Sheen on Hover */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Flip Guide Hint */}
              <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/20 text-[10px] text-white/80 font-mono flex items-center gap-1 backdrop-blur-md z-30">
                <RotateCw size={11} className="text-yellow-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span>탭하여 부적 해설 보기</span>
              </div>
            </div>
          </div>

          {/* ================= BACK: Talisman Lore & Chanting Mantra ================= */}
          <div
            className="absolute inset-0 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.2)] border border-yellow-500/40 p-6 sm:p-8 bg-gradient-to-b from-zinc-900 via-zinc-950 to-amber-950/60 text-left flex flex-col justify-between backdrop-blur-3xl"
            style={{
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-yellow-400" />
                  <span className="text-xs font-bold font-mono text-yellow-300 uppercase tracking-wider">
                    TALISMAN LORE • 부적 해설
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                  {luckyData?.luckLevelTitle || 'LV.4 황금빛 도약 대길'}
                </span>
              </div>

              <div>
                <h4 className="text-lg font-bold text-white tracking-tight">
                  천상대길 만복운집 수호부 (天上大吉 萬福雲集符)
                </h4>
                <p className="text-xs text-white/60 mt-1 font-sans leading-relaxed">
                  {userName}님의 사주 본원({dayMaster})에 부족한 기운을 보양하고, 오늘 하루 침입하는 액운과 구설을 차단하는 영험한 주사경면 수호 신패입니다.
                </p>
              </div>

              {/* Sacred Blessing Mantra */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                <span className="text-[10px] font-bold text-yellow-400/90 font-mono uppercase tracking-wider block">
                  DAILY MANTRA • 수호 축언문
                </span>
                <p className="text-sm font-serif italic text-yellow-200/95 leading-relaxed">
                  {luckyData?.dailyAmuletBlessing || '“당신이 내딛는 모든 발걸음마다 우주의 황금빛 은총과 행운이 동행합니다.”'}
                </p>
              </div>

              {/* How to Carry Today */}
              <div className="p-3.5 rounded-2xl bg-yellow-950/20 border border-yellow-500/25 text-xs text-white/80 space-y-1">
                <span className="text-yellow-400 font-bold block flex items-center gap-1">
                  <Flame size={13} /> 오늘 부적 간직 비법
                </span>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  스마트폰 화면에 저장해 두거나, 마음이 불안할 때 부적을 떠올리며 심호흡 3회를 하시면 수호 결계가 즉시 활성화됩니다.
                </p>
              </div>
            </div>

            <div className="text-center pt-2 border-t border-white/10">
              <span className="text-[10px] font-mono text-white/40">
                탭하여 실물 부적으로 뒤집기 ↻
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="w-full max-w-sm flex flex-wrap items-center justify-center gap-2.5 pt-1">
        {/* Empower Button */}
        <button
          onClick={handleEmpower}
          disabled={isEmpowering}
          className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95 ${
            isEmpowered
              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/50 shadow-[0_0_15px_rgba(234,179,8,0.25)]'
              : 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black border border-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.4)]'
          }`}
        >
          <Zap size={15} className={isEmpowered ? 'text-yellow-400' : 'text-black fill-current'} />
          <span>{isEmpowered ? '기운 충전 완료 (점안됨)' : '부적에 기운 불어넣기 (점안)'}</span>
        </button>

        {/* Download Image Button */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="p-2.5 px-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          title="스마트폰 소장용 고화질 부적 이미지 저장"
        >
          <Download size={15} className="text-yellow-400" />
          <span>소장</span>
        </button>

        {/* Copy Mantra */}
        <button
          onClick={handleCopy}
          className="p-2.5 px-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          title="축언문 복사"
        >
          {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
          <span>{copied ? '복사됨' : '복사'}</span>
        </button>

        {/* TTS Read */}
        <TTSButton
          text={luckyData?.dailyAmuletBlessing || '“당신이 내딛는 모든 발걸음마다 우주의 황금빛 은총과 행운이 동행합니다.”'}
          voice="Kore"
          className="p-2.5 px-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-yellow-300 text-xs font-bold transition-all shadow-md"
        />
      </div>

      {/* Empowered Toast Notification */}
      <AnimatePresence>
        {isEmpowering && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-2xl bg-yellow-500/25 border border-yellow-400/60 text-yellow-200 text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-2xl"
          >
            <Sparkles size={16} className="text-yellow-300 animate-spin" />
            <span>✨ {userName}님의 부적에 천상의 수호 영험이 점안(點眼)되었습니다!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
