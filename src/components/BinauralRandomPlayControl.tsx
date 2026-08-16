import React from 'react';
import { Pause, Shuffle } from 'lucide-react';
import {
  playBinauralBeat,
  stopBinauralBeat,
  getBinauralBeatsForApp,
  pickRandomBinauralTrack,
  type BinauralBeatConfig,
} from '@/lib/binaural';

export type BinauralAppId = 'trinity' | 'orange' | 'muse' | 'bluebird' | 'heal';

const VARIANT_STYLES: Record<
  BinauralAppId,
  { active: string; idle: string }
> = {
  trinity: {
    active: 'bg-yellow-600 text-white shadow-[0_0_15px_rgba(234,179,8,0.5)] scale-105',
    idle: 'bg-white/5 text-yellow-400 hover:bg-white/10',
  },
  orange: {
    active: 'bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)] scale-105',
    idle: 'bg-white/5 text-orange-400 hover:bg-white/10',
  },
  muse: {
    active: 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-105',
    idle: 'bg-white/5 text-blue-400 hover:bg-white/10',
  },
  heal: {
    active: 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-105',
    idle: 'bg-white/5 text-emerald-400 hover:bg-white/10',
  },
  bluebird: {
    active: 'bg-sky-600 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)] scale-105',
    idle: 'bg-white/5 text-sky-400 hover:bg-white/10',
  },
};

type BinauralRandomPlayControlProps = {
  appId: BinauralAppId;
  binauralList: BinauralBeatConfig[];
  currentBinauralTrack: BinauralBeatConfig | null;
  setCurrentBinauralTrack: React.Dispatch<React.SetStateAction<BinauralBeatConfig | null>>;
  isPlayingBinaural: boolean;
  setIsPlayingBinaural: React.Dispatch<React.SetStateAction<boolean>>;
  defaultTrackName: string;
};

export function BinauralRandomPlayControl({
  appId,
  binauralList,
  currentBinauralTrack,
  setCurrentBinauralTrack,
  isPlayingBinaural,
  setIsPlayingBinaural,
  defaultTrackName,
}: BinauralRandomPlayControlProps) {
  const styles = VARIANT_STYLES[appId];

  const handleRandomPlay = () => {
    if (isPlayingBinaural) {
      stopBinauralBeat();
      setIsPlayingBinaural(false);
      return;
    }

    const tracks = binauralList.length > 0 ? binauralList : getBinauralBeatsForApp(appId);
    const randomTrack = pickRandomBinauralTrack(tracks, currentBinauralTrack?.id);
    if (!randomTrack) return;

    setCurrentBinauralTrack(randomTrack);
    playBinauralBeat(randomTrack);
    setIsPlayingBinaural(true);
  };

  return (
    <div className="flex items-center gap-4 w-full">
      <button
        type="button"
        onClick={handleRandomPlay}
        title={isPlayingBinaural ? '일시정지' : '랜덤 재생'}
        aria-label={isPlayingBinaural ? '바이노럴 비트 일시정지' : '바이노럴 비트 랜덤 재생'}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isPlayingBinaural ? styles.active : styles.idle}`}
      >
        {isPlayingBinaural ? (
          <Pause size={20} className="fill-current animate-pulse" />
        ) : (
          <Shuffle size={20} />
        )}
      </button>
      <div className="flex-1 min-w-0 text-left">
        <h4 className="text-xs font-bold text-white font-sans">
          {isPlayingBinaural ? '재생 중' : '랜덤 재생'}
        </h4>
        <p className="text-[10px] text-white/40 mt-1 font-sans truncate leading-relaxed">
          {currentBinauralTrack?.name ?? defaultTrackName}
        </p>
      </div>
    </div>
  );
}