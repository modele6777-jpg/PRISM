import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  BookOpen
} from 'lucide-react';
import { SyncEchoDraft } from '../../lib/rebibleSyncEcho';

interface ReBibleSyncEchoBannerProps {
  draft: SyncEchoDraft;
  onRefreshSyncEcho: () => void;
}

export const ReBibleSyncEchoBanner: React.FC<ReBibleSyncEchoBannerProps> = ({
  draft,
  onRefreshSyncEcho
}) => {
  return (
    <div className="rounded-2xl border border-[#E0D2BA] bg-gradient-to-r from-[#FAF5EB] via-[#F6EFE2] to-[#FAF5EB] p-4 sm:p-5 shadow-xs relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 relative z-10">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
              draft.isAlreadyConsecrated
                ? 'bg-emerald-700 text-white'
                : 'bg-[#854D0E] text-white'
            }`}>
              {draft.isAlreadyConsecrated ? <CheckCircle2 size={14} /> : <Sparkles size={14} />}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-serif text-sm font-bold tracking-tight text-stone-900">
                오늘의 자동 편찬 기록
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EADDC6] text-[#4A321F] border border-[#D5C2A3]">
                {draft.isAlreadyConsecrated ? '기록 보존 중 ✨' : `${draft.activityCount}건의 활동 (주제별 서재 분할 편찬) 📜`}
              </span>
            </div>
          </div>

          <p className="text-xs text-stone-700 leading-relaxed">
            {draft.isAlreadyConsecrated
              ? `${draft.dateDisplay}의 프리즘 여정과 성령의 지혜가 운명·정화·치유·성찰·영감·지혜의 서재에 각각 편찬되어 있습니다.`
              : `오늘 경험한 ${draft.activityCount > 0 ? `${draft.activityCount}건의 활동` : '하루의 발자취'}을 한곳에 몰아넣지 않고 각 주제별 서재에 특화된 지혜 구절로 개별 편찬합니다.`
            }
          </p>

          {/* Activity chips preview */}
          {draft.activityLogs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {draft.activityLogs.slice(0, 4).map((log, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-md border border-[#DCCDB3] bg-[#FCFAF5] text-stone-800 font-medium flex items-center gap-1"
                >
                  <span>{log.icon || '✨'}</span>
                  <span>{log.title}</span>
                </span>
              ))}
              {draft.activityLogs.length > 4 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-[#DCCDB3] bg-[#FCFAF5] text-stone-600">
                  +{draft.activityLogs.length - 4}건
                </span>
              )}
            </div>
          )}
        </div>

        {/* Refresh Sync Button */}
        <button
          onClick={onRefreshSyncEcho}
          className="self-end sm:self-center px-3 py-1.5 rounded-xl border border-[#D5C2A3] bg-[#FCFAF5] hover:bg-[#EFE6D4] text-stone-800 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs active:scale-95"
          title="오늘의 프리즘 활동 새로고침"
        >
          <RefreshCw size={12} className="text-stone-600" />
          <span>동기화</span>
        </button>
      </div>
    </div>
  );
};
