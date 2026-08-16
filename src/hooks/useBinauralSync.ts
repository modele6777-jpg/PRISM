import { useEffect } from 'react';
import {
  getActiveBinauralDappId,
  getActiveBinauralTrackId,
  getBinauralBeatsForApp,
  type BinauralBeatConfig,
} from '@/lib/binaural';
import type { BinauralAppId } from '@/components/BinauralRandomPlayControl';

type UseBinauralSyncOptions = {
  appId: BinauralAppId;
  setIsPlayingBinaural: React.Dispatch<React.SetStateAction<boolean>>;
  setBinauralList: React.Dispatch<React.SetStateAction<BinauralBeatConfig[]>>;
  setCurrentBinauralTrack: React.Dispatch<React.SetStateAction<BinauralBeatConfig | null>>;
};

export function useBinauralSync({
  appId,
  setIsPlayingBinaural,
  setBinauralList,
  setCurrentBinauralTrack,
}: UseBinauralSyncOptions) {
  useEffect(() => {
    const sync = () => {
      const list = getBinauralBeatsForApp(appId);
      setBinauralList(list);
      const activeId = getActiveBinauralTrackId();
      const activeTrack = list.find((t) => t.id === activeId);
      setCurrentBinauralTrack(activeTrack || list[0] || null);
      setIsPlayingBinaural(getActiveBinauralDappId() === appId);
    };

    sync();
    window.addEventListener('binaural-state-change', sync);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('binaural-state-change', sync);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [appId, setIsPlayingBinaural, setBinauralList, setCurrentBinauralTrack]);
}