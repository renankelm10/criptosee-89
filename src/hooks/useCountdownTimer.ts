import { useState, useEffect, useRef } from 'react';

interface UseCountdownTimerProps {
  targetDurationMs: number; // Duração total em milissegundos
  onComplete?: () => void;
  startTime?: number; // Timestamp de quando começou (opcional)
}

export const useCountdownTimer = ({ targetDurationMs, onComplete, startTime }: UseCountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(targetDurationMs);
  const [isRunning, setIsRunning] = useState(false);
  const startTimeRef = useRef(startTime || Date.now());

  // Update start time when it changes
  useEffect(() => {
    if (startTime) {
      startTimeRef.current = startTime;
      // Recalculate time left based on new start time
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, targetDurationMs - elapsed);
      setTimeLeft(remaining);
    }
  }, [startTime, targetDurationMs]);

  const start = () => {
    if (!startTime) {
      startTimeRef.current = Date.now();
    }
    setTimeLeft(targetDurationMs);
    setIsRunning(true);
  };

  const reset = () => {
    startTimeRef.current = Date.now();
    setTimeLeft(targetDurationMs);
    setIsRunning(false);
  };

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) {
      if (timeLeft <= 0 && onComplete) {
        onComplete();
      }
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, targetDurationMs - elapsed);
      setTimeLeft(remaining);

      if (remaining === 0) {
        setIsRunning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, targetDurationMs]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    timeLeft,
    isRunning,
    start,
    reset,
    formatTime: () => formatTime(timeLeft),
  };
};
