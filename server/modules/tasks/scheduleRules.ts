import {isIsoDateString} from '../../../shared/lib/date';
import {isLocalDateTimeString} from '../../../shared/lib/schedule';
import {AppError} from '../../shared/errors/appError';

export const SCHEDULE_UPDATE_REQUIRES_PLANNED_DATE_MESSAGE =
  'Schedule update requires plannedDate or explicit plannedDate null';

export interface TaskScheduleRuleInput {
  plannedDate?: unknown;
  plannedEndDate?: unknown;
  startAt?: unknown;
  endAt?: unknown;
  allDay?: unknown;
}

export interface NormalizedTaskSchedule {
  plannedDate?: string;
  plannedEndDate?: string;
  startAt?: string;
  endAt?: string;
  allDay: boolean;
}

interface NormalizeTaskScheduleOptions {
  allowMissingPlannedDate: boolean;
  requireAllDay: boolean;
}

function hasOwnField(input: TaskScheduleRuleInput, fieldName: keyof TaskScheduleRuleInput): boolean {
  return Object.prototype.hasOwnProperty.call(input, fieldName);
}

function hasNonEmptyValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function hasScheduleDetails(input: TaskScheduleRuleInput): boolean {
  return [input.plannedEndDate, input.startAt, input.endAt].some(hasNonEmptyValue);
}

function parseNullableIsoDate(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !isIsoDateString(value)) {
    throw new AppError(400, `${fieldName} must be a valid date in YYYY-MM-DD format`);
  }
  return value;
}

function parseOptionalIsoDate(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !isIsoDateString(value)) {
    throw new AppError(400, `${fieldName} must be a valid date in YYYY-MM-DD format`);
  }
  return value;
}

function parseOptionalLocalDateTime(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !isLocalDateTimeString(value)) {
    throw new AppError(400, `${fieldName} must be a local ISO datetime without timezone`);
  }
  return value;
}

function parseOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new AppError(400, `${fieldName} must be a boolean`);
  }
  return value;
}

function assertScheduleRules(schedule: NormalizedTaskSchedule): void {
  if (!schedule.plannedDate) {
    if (!schedule.allDay) {
      throw new AppError(400, 'Timed task requires plannedDate');
    }
    return;
  }
  if (schedule.plannedEndDate && schedule.plannedEndDate < schedule.plannedDate) {
    throw new AppError(400, 'plannedEndDate must be after plannedDate');
  }
  if (!schedule.allDay && (!schedule.startAt || !schedule.endAt)) {
    throw new AppError(400, 'Timed task requires startAt and endAt');
  }
  if (schedule.startAt && schedule.endAt && schedule.endAt <= schedule.startAt) {
    throw new AppError(400, 'endAt must be after startAt');
  }
  if (!schedule.allDay && schedule.startAt?.slice(0, 10) !== schedule.plannedDate) {
    throw new AppError(400, 'Timed task date must match plannedDate');
  }
  if (!schedule.allDay && schedule.endAt?.slice(0, 10) !== schedule.plannedDate) {
    throw new AppError(400, 'Cross-day timed tasks are not supported yet');
  }
}

export function normalizeTaskSchedule(
  input: TaskScheduleRuleInput,
  options: NormalizeTaskScheduleOptions,
): NormalizedTaskSchedule {
  const plannedDate = parseNullableIsoDate(input.plannedDate, 'plannedDate');
  const requestedAllDay = parseOptionalBoolean(input.allDay, 'allDay');

  if (!plannedDate) {
    if (hasScheduleDetails(input) || requestedAllDay === false) {
      throw new AppError(400, 'Timed task requires plannedDate');
    }
    if (!options.allowMissingPlannedDate && !(hasOwnField(input, 'plannedDate') && input.plannedDate === null)) {
      throw new AppError(400, SCHEDULE_UPDATE_REQUIRES_PLANNED_DATE_MESSAGE);
    }
    if (options.requireAllDay && requestedAllDay !== true) {
      throw new AppError(400, 'allDay must be a boolean');
    }

    return {
      plannedDate: undefined,
      plannedEndDate: undefined,
      startAt: undefined,
      endAt: undefined,
      allDay: true,
    };
  }

  const startAt = parseOptionalLocalDateTime(input.startAt, 'startAt');
  const endAt = parseOptionalLocalDateTime(input.endAt, 'endAt');
  const allDay = requestedAllDay ?? !(startAt && endAt);

  if (options.requireAllDay && requestedAllDay === undefined) {
    throw new AppError(400, 'allDay must be a boolean');
  }

  const schedule: NormalizedTaskSchedule = {
    plannedDate,
    plannedEndDate: allDay ? parseOptionalIsoDate(input.plannedEndDate, 'plannedEndDate') : undefined,
    startAt: allDay ? undefined : startAt,
    endAt: allDay ? undefined : endAt,
    allDay,
  };
  assertScheduleRules(schedule);
  return schedule;
}
