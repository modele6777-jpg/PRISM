import { DailyBgmPanel } from '@/components/shared/DailyBgmPanel';
import { type DailyBgmAppId, useDailyBgm } from '@/lib/dailyBgm';

type DailyBgmSectionProps = {
  appId: DailyBgmAppId;
  dailyResult: {
    focusPlaylist?: string;
    focusBgmTrackKey?: string;
    focusBgmUrl?: string;
    frequency?: string;
    symbol?: string;
    remedy?: string;
    drawnCard?: { name?: string; nameKo?: string };
    dateKey?: string;
  } | null | undefined;
  onPersist?: (patch: Record<string, unknown>) => void;
  accentClass?: string;
  borderClass?: string;
  buttonClass?: string;
  iconClass?: string;
};

export function DailyBgmSection({
  appId,
  dailyResult,
  onPersist,
  accentClass,
  borderClass,
  buttonClass,
  iconClass,
}: DailyBgmSectionProps) {
  const { loading, playDailyBgm, focusPlaylist } = useDailyBgm(appId, dailyResult, {
    persistResult: onPersist,
  });

  if (!dailyResult) return null;

  return (
    <DailyBgmPanel
      focusPlaylist={focusPlaylist}
      loading={loading}
      onPlay={() => void playDailyBgm()}
      accentClass={accentClass}
      borderClass={borderClass}
      buttonClass={buttonClass}
      iconClass={iconClass}
    />
  );
}