import { useState, useEffect, useCallback } from 'react';
import {
  BinauralState,
  BinauralPreset,
  BINAURAL_PRESETS,
  getBinauralState,
  subscribeBinauralState,
  toggleBinauralBeat,
  startBinauralBeat,
  stopBinauralBeat,
  normalizeBinauralAppId,
} from '@/lib/binauralBeats';

export function useBinauralBeat(currentAppId?: string) {
  const [state, setState] = useState<BinauralState>(() => getBinauralState());

  useEffect(() => {
    return subscribeBinauralState((newState) => {
      setState(newState);
    });
  }, []);

  const normalizedCurrent = currentAppId ? normalizeBinauralAppId(currentAppId) : null;
  const isCurrentAppPlaying = !!(state.isPlaying && normalizedCurrent && state.activeAppId === normalizedCurrent);

  const toggle = useCallback((targetAppId?: string) => {
    const idToToggle = targetAppId || currentAppId || 'bluebird';
    return toggleBinauralBeat(idToToggle);
  }, [currentAppId]);

  const start = useCallback((targetAppId?: string) => {
    const idToStart = targetAppId || currentAppId || 'bluebird';
    return startBinauralBeat(idToStart);
  }, [currentAppId]);

  const stop = useCallback(() => {
    stopBinauralBeat();
  }, []);

  const preset: BinauralPreset | undefined = normalizedCurrent ? BINAURAL_PRESETS[normalizedCurrent] : state.activePreset || undefined;

  return {
    isPlaying: state.isPlaying,
    isCurrentAppPlaying,
    activeAppId: state.activeAppId,
    activePreset: state.activePreset,
    preset,
    toggle,
    start,
    stop,
  };
}
