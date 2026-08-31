import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Printer,
  X,
  Sparkles,
  ShieldCheck,
  HeartPulse,
  Clock,
  Calendar,
  User,
  Activity,
  FileText,
  AlertCircle,
  Copy,
  Check,
  CheckCircle2,
  Building2,
  Stethoscope
} from 'lucide-react';
import { toPng } from 'html-to-image';
import type { ECPRPrescriptionResult } from '@/lib/ai';

interface EmergencyProtocolInfo {
  id: string;
  title: string;
  subtitle: string;
  icon?: any;
  color?: string;
  bg?: string;
  border?: string;
  description: string;
  mantra?: string;
  sosVoiceBadge?: string;
  sosVoiceText?: string;
  eftSetupAffirmation?: string;
  eftReminders?: string[];
}

interface ECPRPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: ECPRPrescriptionResult;
  userName: string;
  protocol: EmergencyProtocolInfo;
  userSymptom?: string;
  activeEFTMantra?: string;
}

export function ECPRPrescriptionModal({
  isOpen,
  onClose,
  prescription,
  userName,
  protocol,
  userSymptom,
  activeEFTMantra,
}: ECPRPrescriptionModalProps) {
  const paperRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [customPatientName, setCustomPatientName] = useState(userName || '내담자');
  const [isEditingName, setIsEditingName] = useState(false);

  // Generate deterministic issue date & document serial number
  const today = new Date();
  const issueDateStr = today.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const issueTimeStr = today.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const serialNo = `eCPR-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Download prescription as pristine high-res PNG image
  const handleDownloadImage = async () => {
    if (!paperRef.current) return;
    try {
      setIsDownloading(true);
      // Ensure fonts and icons render crisply with high pixel ratio
      const dataUrl = await toPng(paperRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: '#FFFFFF',
      });

      const link = document.createElement('a');
      const safeName = (customPatientName || '내담자').replace(/[^a-zA-Z0-9가-힣]/g, '_');
      link.download = `eCPR_임상감정처방전_${safeName}_${today.toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to export prescription image:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Direct Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Copy structured text summary
  const handleCopyText = async () => {
    const textToCopy = `[eCPR 긴급 감정 구급 처방전 및 임상 소견서]
문서번호: ${serialNo}
발급일시: ${issueDateStr} ${issueTimeStr}
수진인: ${customPatientName}
위기분류: ${protocol.title} (${protocol.subtitle})
주관적 고통지수: SUDS 9/10 (급성 고위험군)
주 호소 증상: ${userSymptom || protocol.description}

[긴급 처방 내역]
1. 신체 생체 리셋 (Rx 1): ${prescription.step1Somatic}
2. 호흡 자율신경 안정 (Rx 2): ${prescription.step2Respiration}
3. 마음 구급 확언 (Rx 3): ${prescription.step3Mantra}
4. 임상 긴급 처방 메시지: "${prescription.soothingMessage}"

발급기관: 루시 유니버스 eCPR 임상심리구급의학 센터 (정신건강의학과/전문상담 참고용)`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-3xl bg-neutral-900 border border-amber-500/30 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Modal Top Control Bar */}
          <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/10 bg-neutral-950/80 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <FileText size={17} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>eCPR 실물 처방전 발급실</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    진료/상담 제출용 고해상도 규격
                  </span>
                </h3>
                <p className="text-[11px] text-white/50">
                  실제 정신건강의학과 및 임상심리상담소에 진료 참고용으로 제출 가능한 정밀 의무 서식입니다.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer border border-white/10"
              title="닫기"
            >
              <X size={18} />
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="px-5 sm:px-7 py-3 bg-neutral-900/90 border-b border-white/5 flex items-center justify-between gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span>내담자 성명:</span>
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={customPatientName}
                    onChange={(e) => setCustomPatientName(e.target.value)}
                    className="px-2 py-0.5 rounded-lg bg-black/60 border border-amber-400/60 text-white text-xs outline-none w-28"
                    placeholder="성명 입력"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="px-2 py-0.5 rounded-lg bg-amber-500 text-black text-[11px] font-bold"
                  >
                    확인
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/15 text-amber-300 font-bold border border-white/10 text-xs flex items-center gap-1 cursor-pointer"
                  title="성명 변경"
                >
                  <span>{customPatientName || '내담자'}</span>
                  <span className="text-[10px] text-white/40 font-normal">✎ 수정</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
                title="텍스트로 복사"
              >
                {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{isCopied ? '복사완료' : '텍스트 복사'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:flex px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium transition-all items-center gap-1.5 border border-white/10 cursor-pointer"
                title="인쇄"
              >
                <Printer size={13} />
                <span>인쇄</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isDownloading}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isDownloading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>발급 중...</span>
                  </>
                ) : downloadSuccess ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-300" />
                    <span>저장 완료!</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>📥 실물 이미지 발급 (PNG 저장)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Scrollable Paper Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-7 flex justify-center bg-neutral-950/60">
            {/* The Authentic Clinical Physical Prescription Sheet (White Medical Ivory Print Canvas) */}
            <div
              ref={paperRef}
              id="ecpr-physical-prescription-sheet"
              className="w-full max-w-[650px] bg-[#FFFFFF] text-neutral-900 p-6 sm:p-8 rounded-2xl shadow-2xl border-[3px] border-neutral-800 relative font-sans text-left print:border-none print:shadow-none select-none"
              style={{
                boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5)',
                color: '#1a1a1a',
                fontFamily: `'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif`,
              }}
            >
              {/* Micro Guilloche Security Edge Frame */}
              <div className="absolute inset-2 sm:inset-3 border border-neutral-300 pointer-events-none rounded-xl" />
              <div className="absolute inset-2.5 sm:inset-3.5 border-[0.5px] border-neutral-200 pointer-events-none rounded-lg" />

              {/* Watermark Crest Background */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
                <div className="w-80 h-80 rounded-full border-[16px] border-neutral-900 flex items-center justify-center font-serif text-8xl font-black">
                  Rx
                </div>
              </div>

              {/* Header: Organization & Document Identification */}
              <div className="relative border-b-2 border-neutral-800 pb-4 mb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-neutral-500 uppercase font-mono mb-1">
                      <ShieldCheck size={12} className="text-neutral-700" />
                      <span>EMERGENCY PSYCHOLOGICAL CONSULTATION NOTE & RX</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-950 flex items-center gap-2 font-serif">
                      <span>eCPR 감정 긴급 처방전 및 임상 소견서</span>
                    </h1>
                    <p className="text-[10px] text-neutral-600 font-medium mt-0.5">
                      [외래/응급 자가심리구급 기록지 · 정신건강의학과 및 전문상담 진료 제출 참고용]
                    </p>
                  </div>

                  {/* Serial & Barcode simulation */}
                  <div className="text-right shrink-0">
                    <div className="inline-block bg-neutral-100 border border-neutral-300 px-2 py-1 rounded text-right">
                      <div className="text-[9px] font-mono text-neutral-500">CONTROL NO.</div>
                      <div className="text-[11px] font-mono font-bold text-neutral-900">{serialNo}</div>
                    </div>
                    <div className="mt-1 font-mono text-[8px] tracking-widest text-neutral-400">
                      ||| | | |||| | ||| || ||| |
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient & Assessment Spec Table */}
              <div className="relative border border-neutral-300 rounded-lg overflow-hidden mb-4 bg-neutral-50/70 text-xs">
                <div className="grid grid-cols-4 divide-x divide-neutral-200 border-b border-neutral-200">
                  <div className="p-2 bg-neutral-200/70 font-bold text-neutral-700 text-center text-[11px]">
                    수진자 성명
                  </div>
                  <div className="p-2 font-bold text-neutral-900 text-center text-[12px] bg-white">
                    {customPatientName || '내담자'}
                  </div>
                  <div className="p-2 bg-neutral-200/70 font-bold text-neutral-700 text-center text-[11px]">
                    발급 일시
                  </div>
                  <div className="p-2 text-neutral-800 text-center font-mono text-[11px] bg-white">
                    {issueDateStr} {issueTimeStr.slice(0, 5)}
                  </div>
                </div>

                <div className="grid grid-cols-4 divide-x divide-neutral-200">
                  <div className="p-2 bg-neutral-200/70 font-bold text-neutral-700 text-center text-[11px]">
                    주 호소 위기군
                  </div>
                  <div className="p-2 font-semibold text-red-700 text-center text-[11px] bg-white">
                    {protocol.title}
                  </div>
                  <div className="p-2 bg-neutral-200/70 font-bold text-neutral-700 text-center text-[11px]">
                    고통 지수 (SUDS)
                  </div>
                  <div className="p-2 text-center text-[11px] font-bold text-red-600 bg-white font-mono">
                    9 / 10 <span className="text-[9px] font-normal text-neutral-500">(급성 과각성)</span>
                  </div>
                </div>
              </div>

              {/* Subjective Chief Complaints (주 호소 증상 및 발병 정황) */}
              <div className="relative mb-4">
                <div className="text-[11px] font-bold text-neutral-800 border-b border-neutral-300 pb-1 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Activity size={12} className="text-neutral-700" />
                    <span>1. 주 호소 증상 및 자율신경 위기 정황 (Chief Complaints & Clinical Presentation)</span>
                  </span>
                  <span className="text-[9px] text-neutral-400 font-mono">Symptom Record</span>
                </div>
                <div className="p-2.5 rounded-md bg-neutral-100/80 border border-neutral-200 text-xs text-neutral-800 leading-relaxed font-sans">
                  {userSymptom ? (
                    <span>"{userSymptom}"</span>
                  ) : (
                    <span>
                      내담자는 현재 <strong className="text-neutral-900">{protocol.title}</strong> 상태로 인한 급성 교감신경 과각성, 심박 항진 및 정서적 과부하를 호소함. ({protocol.description})
                    </span>
                  )}
                </div>
              </div>

              {/* Emergency Prescription Rx List */}
              <div className="relative mb-4">
                <div className="text-[11px] font-bold text-neutral-800 border-b-2 border-neutral-800 pb-1 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1 font-serif">
                    <Stethoscope size={13} className="text-neutral-800" />
                    <span className="font-bold">2. 긴급 구급 처방 내역 (Emergency Somatic & Cognitive Rx)</span>
                  </span>
                  <span className="text-[9px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded font-mono">
                    즉시 시행
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Rx 1: Somatic Reset */}
                  <div className="p-2.5 rounded-md border border-neutral-300 bg-white flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded bg-sky-100 border border-sky-300 text-sky-800 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                      Rx 1
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-neutral-900 text-[11px] mb-0.5 flex items-center gap-1.5">
                        <span>소매틱 생체 신체 리셋 (Somatic Sensory Regulation)</span>
                        <span className="text-[9px] text-neutral-500 font-normal">미주신경 자율 조절</span>
                      </div>
                      <p className="text-neutral-700 text-[11px] leading-relaxed">
                        {prescription.step1Somatic}
                      </p>
                    </div>
                  </div>

                  {/* Rx 2: Respiration Autonomic Reset */}
                  <div className="p-2.5 rounded-md border border-neutral-300 bg-white flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded bg-amber-100 border border-amber-300 text-amber-800 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                      Rx 2
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-neutral-900 text-[11px] mb-0.5 flex items-center gap-1.5">
                        <span>호흡 및 교감신경 진정 처방 (Vagus Autonomic Respiration)</span>
                        <span className="text-[9px] text-neutral-500 font-normal">4-7-8 / 생리학적 한숨</span>
                      </div>
                      <p className="text-neutral-700 text-[11px] leading-relaxed">
                        {prescription.step2Respiration}
                      </p>
                    </div>
                  </div>

                  {/* Rx 3: Cognitive Mantra */}
                  <div className="p-2.5 rounded-md border border-neutral-300 bg-white flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                      Rx 3
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-neutral-900 text-[11px] mb-0.5 flex items-center gap-1.5">
                        <span>인지 재구조화 및 즉효성 수용 확언 (Cognitive Crisis Mantra)</span>
                        <span className="text-[9px] text-neutral-500 font-normal">심리 진통 처방</span>
                      </div>
                      <p className="text-neutral-800 font-semibold text-[11px] leading-relaxed">
                        "{prescription.step3Mantra}"
                      </p>
                    </div>
                  </div>

                  {/* Special Calming Message */}
                  <div className="p-2.5 rounded-md border border-purple-200 bg-purple-50/50 text-[11px] text-purple-900 leading-relaxed italic">
                    <strong className="not-italic text-purple-950 font-bold">👩‍⚕️ 임상 심리 처방 소견:</strong> "{prescription.soothingMessage}"
                  </div>
                </div>
              </div>

              {/* Doctor / Institute Clinical Summary & Referral Recommendation */}
              <div className="relative border-t border-neutral-300 pt-3 mb-4 text-[10px] text-neutral-600 leading-relaxed space-y-1">
                <div className="font-bold text-neutral-800 flex items-center gap-1">
                  <AlertCircle size={11} className="text-amber-600" />
                  <span>[임상 권고사항 및 전문의 진료 안내]</span>
                </div>
                <p>
                  본 처방전은 긴급 감정 위기(eCPR) 발생 시 신체적·심리적 급성 과각성 상태를 진정시키기 위해 발급된 디지털 심리 구급 의무 기록입니다. 증상이 지속되거나 일상 기능 장애 및 불면·공황이 2주 이상 지속될 경우, 본 기록지를 지참하시어 <strong className="text-neutral-900 underline">정신건강의학과 전문의 진료 및 공인 임상심리전문가 상담</strong>을 받으시길 권고합니다.
                </p>
                <div className="flex items-center gap-3 font-mono text-[9px] text-neutral-500 pt-0.5">
                  <span>· 24시간 정신건강위기상담: 1577-0199</span>
                  <span>· 자살예방상담: 1393</span>
                  <span>· 보건복지상담센터: 129</span>
                </div>
              </div>

              {/* Official Seal & Signature Footer */}
              <div className="relative border-t-2 border-neutral-800 pt-3 flex items-end justify-between">
                <div>
                  <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
                    ISSUING INSTITUTE
                  </div>
                  <div className="text-xs font-bold text-neutral-900 flex items-center gap-1">
                    <Building2 size={13} className="text-neutral-700" />
                    <span>루시 유니버스 eCPR 임상심리구급의학 센터</span>
                  </div>
                  <div className="text-[9px] text-neutral-500 font-mono mt-0.5">
                    LUCY CLINICAL SOUL CARE & PSYCHOLOGICAL EMERGENCY INSTITUTE
                  </div>
                </div>

                {/* Director Official Stamp Seal */}
                <div className="relative flex items-center justify-center">
                  <div className="text-right mr-3">
                    <div className="text-[9px] font-mono text-neutral-500">CLINICAL DIRECTOR</div>
                    <div className="text-xs font-black text-neutral-900 font-serif">임상디렉터 AI LUCY</div>
                  </div>

                  {/* Red Square Seal Stamp */}
                  <div className="w-14 h-14 border-2 border-red-600 rounded-lg flex flex-col items-center justify-center text-red-600 font-black text-[9px] leading-tight tracking-tighter transform -rotate-3 select-none bg-red-50/40 shadow-sm">
                    <span className="border-b border-red-400 pb-0.5 px-1">루시유니버스</span>
                    <span className="pt-0.5">심리처방인</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="px-6 py-3.5 bg-neutral-950 border-t border-white/10 flex items-center justify-between text-xs text-white/50 shrink-0">
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              <span>다운로드한 PNG 이미지는 스마트폰 갤러리에 저장하거나 병원 진료 시 바로 보여줄 수 있습니다.</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-all cursor-pointer"
            >
              닫기
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
