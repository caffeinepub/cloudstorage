import { useCallback, useEffect, useRef } from "react";

interface UseInactivityDetectionOptions {
  timeoutMs: number;
  onTimeout: () => void;
  onWarning?: () => void;
  warningBeforeMs?: number;
  enabled?: boolean;
}

export function useInactivityDetection({
  timeoutMs,
  onTimeout,
  onWarning,
  warningBeforeMs = 60_000,
  enabled = true,
}: UseInactivityDetectionOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  const onWarningRef = useRef(onWarning);

  // Keep refs up to date
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);
  useEffect(() => {
    onWarningRef.current = onWarning;
  }, [onWarning]);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();

    if (onWarningRef.current && timeoutMs > warningBeforeMs) {
      warningRef.current = setTimeout(() => {
        onWarningRef.current?.();
      }, timeoutMs - warningBeforeMs);
    }

    timeoutRef.current = setTimeout(() => {
      onTimeoutRef.current();
    }, timeoutMs);
  }, [timeoutMs, warningBeforeMs, clearTimers]);

  const resetTimer = useCallback(() => {
    if (enabled) {
      startTimers();
    }
  }, [enabled, startTimers]);

  const stopTimer = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    startTimers();

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ];

    const handleActivity = () => {
      startTimers();
    };

    for (const event of events) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearTimers();
        onTimeoutRef.current();
      } else {
        startTimers();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimers();
      for (const event of events) {
        window.removeEventListener(event, handleActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, startTimers, clearTimers]);

  return { resetTimer, stopTimer };
}
