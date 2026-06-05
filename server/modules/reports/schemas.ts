import {AppError} from '../../shared/errors/appError';

export function parseDailyDate(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    throw new AppError(400, 'Query parameter "date" (YYYY-MM-DD) is required.');
  }
  return value;
}

export function parseDailyBodyDate(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    throw new AppError(400, 'Body parameter "date" (YYYY-MM-DD) is required.');
  }
  return value;
}

export function parseWeekStart(value: unknown, source: 'query' | 'body'): string {
  if (typeof value !== 'string' || !value) {
    throw new AppError(
      400,
      source === 'query'
        ? 'Query parameter "weekStart" (YYYY-MM-DD) is required.'
        : 'Body parameter "weekStart" (YYYY-MM-DD) is required.',
    );
  }
  return value;
}

