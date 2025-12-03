/**
 * Custom hook for managing session timeout and idle detection
 * Extracted from AuthContext for better separation of concerns
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SESSION } from '@/lib/app-constants';

export interface SessionTimeoutConfig {
  /** Time in milliseconds before session times out due to inactivity */
  timeout?: number;
  /** Time in milliseconds before timeout to show warning */
  warningBefore?: number;
  /** Events to track for activity detection */
  activityEvents?: string[];
  /** Callback when session times out */
  onTimeout?: () => void;
  /** Callback when warning is triggered */
  onWarning?: () => void;
  /** Whether session timeout is enabled */
  enabled?: boolean;
}

export interface SessionTimeoutState {
  /** Whether the warning dialog should be shown */
  showWarning: boolean;
  /** Remaining time in milliseconds before timeout (null if not in warning state) */
  remainingTime: number | null;
  /** Extends the session by resetting timers */
  extendSession: () => void;
  /** Manually trigger timeout */
  triggerTimeout: () => void;
  /** Whether the session is currently active */
  isActive: boolean;
  /** Time of last activity */
  lastActivity: number;
}

const DEFAULT_CONFIG: Required<Omit<SessionTimeoutConfig, 'onTimeout' | 'onWarning'>> = {
  timeout: SESSION.IDLE_TIMEOUT, // 30 minutes
  warningBefore: SESSION.IDLE_WARNING_TIME, // 5 minutes before
  activityEvents: ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'],
  enabled: true,
};

/**
 * Hook for managing session timeout with activity tracking
 *
 * @example
 * ```tsx
 * const { showWarning, remainingTime, extendSession } = useSessionTimeout({
 *   onTimeout: () => signOut(),
 *   onWarning: () => console.log('Session expiring soon'),
 * });
 * ```
 */
export function useSessionTimeout(config: SessionTimeoutConfig = {}): SessionTimeoutState {
  const {
    timeout = DEFAULT_CONFIG.timeout,
    warningBefore = DEFAULT_CONFIG.warningBefore,
    activityEvents = DEFAULT_CONFIG.activityEvents,
    onTimeout,
    onWarning,
    enabled = DEFAULT_CONFIG.enabled,
  } = config;

  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Refs to avoid stale closures
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  const onWarningRef = useRef(onWarning);

  // Keep callback refs updated
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
    onWarningRef.current = onWarning;
  }, [onTimeout, onWarning]);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (warningTimeoutIdRef.current) {
      clearTimeout(warningTimeoutIdRef.current);
      warningTimeoutIdRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Reset activity timer
  const resetActivityTimer = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    setLastActivity(now);
    setShowWarning(false);
    setRemainingTime(null);
    clearAllTimers();
  }, [clearAllTimers]);

  // Extend session (public API)
  const extendSession = useCallback(() => {
    console.log('🔄 [SessionTimeout] Session extended');
    resetActivityTimer();
    setIsActive(true);
  }, [resetActivityTimer]);

  // Trigger timeout manually
  const triggerTimeout = useCallback(() => {
    console.log('⏰ [SessionTimeout] Manual timeout triggered');
    setShowWarning(false);
    setRemainingTime(null);
    setIsActive(false);
    clearAllTimers();
    onTimeoutRef.current?.();
  }, [clearAllTimers]);

  // Setup session timeout timers
  const setupSessionTimeout = useCallback(() => {
    if (!enabled) return;

    // Clear existing timeouts
    clearAllTimers();

    // Set warning timeout
    warningTimeoutIdRef.current = setTimeout(() => {
      console.log('⚠️ [SessionTimeout] Warning triggered');
      setShowWarning(true);
      onWarningRef.current?.();

      // Start countdown
      let timeLeft = warningBefore;
      setRemainingTime(timeLeft);

      countdownIntervalRef.current = setInterval(() => {
        timeLeft -= 1000;
        setRemainingTime(Math.max(0, timeLeft));

        if (timeLeft <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
        }
      }, 1000);
    }, timeout - warningBefore);

    // Set actual timeout
    timeoutIdRef.current = setTimeout(() => {
      console.log('⏰ [SessionTimeout] Session timed out due to inactivity');
      setShowWarning(false);
      setRemainingTime(null);
      setIsActive(false);
      onTimeoutRef.current?.();
    }, timeout);
  }, [enabled, timeout, warningBefore, clearAllTimers]);

  // Track user activity
  useEffect(() => {
    if (!enabled) return;

    const handleActivity = () => {
      const now = Date.now();
      // Debounce: only reset if enough time has passed (1 second)
      if (now - lastActivityRef.current > 1000) {
        lastActivityRef.current = now;
        setLastActivity(now);

        // If warning is showing, reset the timeout on activity
        if (showWarning) {
          console.log('🔄 [SessionTimeout] Activity detected during warning, resetting');
          setupSessionTimeout();
        }
      }
    };

    // Add activity listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Setup initial timeout
    setupSessionTimeout();

    return () => {
      // Cleanup listeners
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });

      // Clear all timeouts
      clearAllTimers();
    };
  }, [enabled, showWarning, activityEvents, setupSessionTimeout, clearAllTimers]);

  return {
    showWarning,
    remainingTime,
    extendSession,
    triggerTimeout,
    isActive,
    lastActivity,
  };
}

/**
 * Format remaining time for display
 * @param ms - Time in milliseconds
 * @returns Formatted time string (e.g., "4:59")
 */
export function formatRemainingTime(ms: number | null): string {
  if (ms === null || ms < 0) return '0:00';

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default useSessionTimeout;
