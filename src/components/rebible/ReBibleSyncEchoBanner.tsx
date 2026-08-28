import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw, 
  Layers, 
  Feather,
  BookOpen
} from 'lucide-react';
import { SacredAtmosphere, ReBibleVerse } from '../../types/rebible';
import { SyncEchoDraft } from '../../lib/rebibleSyncEcho';

interface ReBibleSyncEchoBannerProps {
  draft: SyncEchoDraft;
  atmosphere: SacredAtmosphere;
  onOpenSyncEchoModal: () => void;
  onRefreshSyncEcho: () => void;
}

export const ReBibleSyncEchoBanner: React.FC<ReBibleSyncEchoBannerProps> = ({
  draft,
  atmosphere,
  onOpenSyncEchoModal,
  onRefreshSyncEcho
}) => {
  const isParchment = atmosphere === 'parchment';

  return (
    <div className={`rounded-3xl border p-4 sm:p-5 transition-all shadow-md relative overflow-hidden ${
      draft.isAlreadyConsecrated
        ? isParchment
          ? 'bg-amber-100/40 border-amber-900/15'
          : 'bg-slate-900/40 border-slate-800/80'
        : isParchment
        ? 'bg-gradient-to-r from-amber-100/90 via-amber-50 to-amber-100/70 border-amber-800/30'
        : 'bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-amber-950/20 border-amber-500/30'
    }`}>
      {/* Radiant ambient glow */}
      {!draft.isAlreadyConsecrated && (
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      )}

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left Info */}
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs ${
              draft.isAlreadyConsecrated
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 animate-pulse'
            }`}>
              {draft.isAlreadyConsecrated ? <CheckCircle2 size={15} /> : <Sparkles size={15} />}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-serif text-sm font-black tracking-tight flex items-center gap-1">
                Sync:Echo (싱크 에코)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                draft.isAlreadyConsecrated
                  ? isParchment ? 'bg-amber-200 text-amber-900' : 'bg-emerald-500/10 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
              }`}>
                {draft.isAlreadyConsecrated ? '오늘 각인 완료 ✨' : '자동 동기화 준비됨 📡'}
              </span>
            </div>
          </div>

          <p className={`text-xs leading-relaxed ${
            isParchment ? 'text-stone-700' : 'text-slate-300'
          }`}>
            {draft.isAlreadyConsecrated
              ? `${draft.dateDisplay}의 프리즘 수행과 루시의 조언이 '${draft.suggestedBook}'에 거룩히 보존되고 있습니다.`
              : `오늘 프리즘에서 수행한 ${draft.activityCount > 0 ? `${draft.activityCount}건의 활동(타로·정화·루시 대화)` : '영적 하루'}이 한 편의 경전으로 엮였습니다. 생각만 한 줄 얹어 각인하세요.`
            }
          </p>

          {/* Activity chips preview */}
          {draft.activityLogs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {draft.activityLogs.slice(0, 3).map((log, i) => (
                <span
                  key={i}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium flex items-center gap-1 ${
                    isParchment
                      ? 'bg-white/80 border-amber-900/15 text-stone-700'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <span>{log.icon || '✨'}</span>
                  <span>{log.title}</span>
                </span>
              ))}
              {draft.activityLogs.length > 3 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-lg border ${
                  isParchment ? 'bg-amber-200/50 text-stone-600' : 'bg-slate-900 text-slate-400'
                }`}>
                  +{draft.activityLogs.length - 3}건
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onRefreshSyncEcho}
            className={`p-2.5 rounded-xl border transition ${
              isParchment
                ? 'bg-white/80 border-amber-900/15 text-stone-600 hover:bg-white'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
            title="프리즘 최신 활동 새로고침"
          >
            <RefreshCw size={14} />
          </button>

          <button
            type="button"
            onClick={onOpenSyncEchoModal}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2 active:scale-95 ${
              draft.isAlreadyConsecrated
                ? isParchment
                  ? 'bg-amber-200/80 hover:bg-amber-300/80 text-amber-950 border border-amber-800/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                : 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-950 hover:brightness-105 shadow-amber-500/20'
            }`}
          >
            <Feather size={15} />
            <span>{draft.isAlreadyConsecrated ? 'Sync:Echo 열람 및 수정' : '오늘의 지혜 각인하기'}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
