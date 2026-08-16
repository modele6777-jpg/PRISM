import { Headphones } from 'lucide-react';

type DailyBgmPanelProps = {
  focusPlaylist: string;
  loading?: boolean;
  onPlay: () => void;
  accentClass?: string;
  borderClass?: string;
  buttonClass?: string;
  iconClass?: string;
};

export function DailyBgmPanel({
  focusPlaylist,
  loading = false,
  onPlay,
  accentClass = 'text-yellow-400',
  borderClass = 'border-yellow-500/30',
  buttonClass = 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30 text-yellow-300',
  iconClass = 'text-yellow-400',
}: DailyBgmPanelProps) {
  if (!focusPlaylist) return null;

  return (
    <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-full bg-white/5 border ${borderClass} flex items-center justify-center shrink-0`}>
          <Headphones size={18} className={`${iconClass} animate-pulse`} />
        </div>
        <div className="min-w-0">
          <span className="text-[8px] text-white/40 uppercase tracking-widest block animate-pulse">
            RECOMMENDED SOUNDS
          </span>
          <span className={`text-xs font-bold text-white block truncate ${accentClass}`}>
            {focusPlaylist}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onPlay}
        disabled={loading}
        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait shrink-0 ${buttonClass}`}
      >
        {loading ? 'BGM 생성 중...' : 'Play BGM'}
      </button>
    </div>
  );
}