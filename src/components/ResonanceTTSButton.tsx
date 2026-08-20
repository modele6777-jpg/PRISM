import React, { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { normalizeTextForSpeech, playTTS, stopTTS, subscribeTTS } from "@/utils/tts";

interface ResonanceTTSButtonProps {
  data: any;
  app?: string;
  className?: string;
}

function buildResonanceSpeechText(data: any): string {
  if (!data) return "";

  const parts: string[] = [];

  if (data.coherence != null) {
    parts.push(`일관성 지수 ${data.coherence}퍼센트.`);
  }
  if (data.bandText) {
    parts.push(`주파수 대역. ${data.bandText}.`);
  }
  if (data.freqText) {
    parts.push(data.freqText);
  }
  if (data.shieldToken) {
    parts.push(`수호 코드. ${data.shieldToken}.`);
  }
  if (data.prescription) {
    parts.push(`처방. ${data.prescription}`);
  }
  if (data.guidance) {
    parts.push(`가이드. ${data.guidance}`);
  }
  if (data.cosmicAspect) {
    parts.push(data.cosmicAspect);
  }
  if (data.advice) {
    parts.push(`실천 조언. ${data.advice}`);
  }

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return data.advice || data.analysis || data.text || data.desc || "";
}

export function ResonanceTTSButton({ data, className = "" }: ResonanceTTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const speechText = normalizeTextForSpeech(buildResonanceSpeechText(data));

  useEffect(() => {
    return subscribeTTS((state) => {
      const activeForThisButton =
        (state.isSpeaking || state.isLoading) &&
        !!speechText &&
        state.activeText === speechText;
      setIsPlaying(activeForThisButton);
    });
  }, [speechText]);

  const handleToggle = () => {
    if (isPlaying) {
      stopTTS();
      return;
    }

    if (!speechText) return;
    playTTS(speechText);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`flex-1 py-4 rounded-2xl border font-bold tracking-widest text-xs md:text-sm active:scale-95 transition-all cursor-pointer select-none flex items-center justify-center gap-2 ${className}`}
    >
      {isPlaying ? (
        <>
          <VolumeX size={16} className="animate-pulse" />
          <span>듣기 중단</span>
        </>
      ) : (
        <>
          <Volume2 size={16} />
          <span>음성으로 듣기</span>
        </>
      )}
    </button>
  );
}