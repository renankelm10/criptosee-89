import { useState, useEffect } from 'react';

interface UseCountdownTimerProps {
  targetDurationMs: number; // Duração total em milissegundos
  onComplete?: () => void;
}

export const useCountdownTimer = ({ targetDurationMs, onComplete }: UseCountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(targetDurationMs);
  const [isRunning, setIsRunning] = useState(false);

  const start = () => {
    setTimeLeft(targetDurationMs);
    setIsRunning(true);
  };

  const reset = () => {
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
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]); // Removido onComplete das dependências

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