import { useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import AutoLockWarning from "../components/AutoLockWarning";
import LockScreenOverlay from "../components/LockScreenOverlay";
import { useInactivityDetection } from "../hooks/useInactivityDetection";

export interface AutoLockConfig {
  enabled: boolean;
  timeoutMinutes: number; // 0 = never
  pinHash: string | null;
}

export interface AutoLockContextValue {
  isLocked: boolean;
  lock: () => void;
  unlock: () => void;
  config: AutoLockConfig;
  updateConfig: (config: Partial<AutoLockConfig>) => void;
}

export const AutoLockContext = createContext<AutoLockContextValue | null>(null);

const STORAGE_KEY = "autolock_config";
const DEFAULT_CONFIG: AutoLockConfig = {
  enabled: false,
  timeoutMinutes: 15,
  pinHash: null,
};

function loadConfig(): AutoLockConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config: AutoLockConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

interface AutoLockProviderProps {
  children: ReactNode;
  userName: string;
  isAuthenticated: boolean;
}

export function AutoLockProvider({
  children,
  userName,
  isAuthenticated,
}: AutoLockProviderProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [config, setConfig] = useState<AutoLockConfig>(loadConfig);
  const queryClient = useQueryClient();
  const logLockEventRef = useRef<
    ((action: string, details: string) => void) | null
  >(null);

  const timeoutMs =
    config.enabled && config.timeoutMinutes > 0
      ? config.timeoutMinutes * 60 * 1000
      : 0;

  const lock = useCallback(() => {
    setIsLocked(true);
    setShowWarning(false);
    // Pause all queries while locked
    queryClient.cancelQueries();
    logLockEventRef.current?.("AUTO_LOCK", "Session locked due to inactivity");
  }, [queryClient]);

  const unlock = useCallback(() => {
    setIsLocked(false);
    setShowWarning(false);
    logLockEventRef.current?.("UNLOCK", "Session unlocked by user");
  }, []);

  const handleWarning = useCallback(() => {
    if (!isLocked) {
      setShowWarning(true);
    }
  }, [isLocked]);

  const handleDismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  const handleUnlockAttempt = useCallback(
    (method: "pin" | "identity", success: boolean) => {
      logLockEventRef.current?.(
        "UNLOCK_ATTEMPT",
        `Unlock attempt via ${method}: ${success ? "success" : "failed"}`,
      );
    },
    [],
  );

  const updateConfig = useCallback((partial: Partial<AutoLockConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      saveConfig(next);
      return next;
    });
  }, []);

  const { resetTimer, stopTimer } = useInactivityDetection({
    timeoutMs: timeoutMs > 0 ? timeoutMs : 999_999_999,
    onTimeout: lock,
    onWarning: handleWarning,
    warningBeforeMs: 60_000,
    enabled:
      isAuthenticated &&
      !isLocked &&
      config.enabled &&
      config.timeoutMinutes > 0,
  });

  // When unlocked, reset the inactivity timer
  useEffect(() => {
    if (!isLocked && isAuthenticated && config.enabled) {
      resetTimer();
    }
  }, [isLocked, isAuthenticated, config.enabled, resetTimer]);

  // Stop timer when not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      stopTimer();
      setIsLocked(false);
      setShowWarning(false);
    }
  }, [isAuthenticated, stopTimer]);

  const contextValue: AutoLockContextValue = {
    isLocked,
    lock,
    unlock,
    config,
    updateConfig,
  };

  return (
    <AutoLockContext.Provider value={contextValue}>
      {children}

      {/* Warning notification */}
      {showWarning && !isLocked && (
        <AutoLockWarning
          secondsRemaining={60}
          onDismiss={handleDismissWarning}
        />
      )}

      {/* Lock screen overlay */}
      <LockScreenOverlay
        isLocked={isLocked}
        userName={userName}
        storedPinHash={config.pinHash}
        onUnlockSuccess={unlock}
        onUnlockAttempt={handleUnlockAttempt}
      />
    </AutoLockContext.Provider>
  );
}
