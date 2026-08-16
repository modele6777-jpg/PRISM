import { useEffect } from "react";
import { autoGeneratePictureDiaryIfNeeded } from "@/lib/pictureDiary";

export function usePictureDiaryAutoRun(uid: string | undefined) {
  useEffect(() => {
    if (!uid) return;

    const run = () => {
      void autoGeneratePictureDiaryIfNeeded(uid);
    };

    run();
    window.addEventListener("orange-chat-saved", run);
    return () => window.removeEventListener("orange-chat-saved", run);
  }, [uid]);
}