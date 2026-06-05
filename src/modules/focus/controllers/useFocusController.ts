import {useMemo} from 'react';

export function formatFocusElapsed(elapsedSeconds: number): string {
  const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(elapsedSeconds % 60).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

export function calculateFocusRingOffset(elapsedSeconds: number, circumference = 653): number {
  const progress = Math.min(1, (elapsedSeconds % 3600) / 3600);
  return circumference - circumference * progress;
}

export function useFocusController(focusTimeElapsed: number) {
  return useMemo(
    () => ({
      formattedElapsed: formatFocusElapsed(focusTimeElapsed),
      progressOffset: calculateFocusRingOffset(focusTimeElapsed),
    }),
    [focusTimeElapsed],
  );
}
