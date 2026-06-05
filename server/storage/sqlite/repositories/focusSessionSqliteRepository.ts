import type Database from 'better-sqlite3';

import type {
  CreateRunningSessionInput,
  FocusSessionRepository,
  StopSessionInput,
} from '../../../modules/focus/repository';
import type {TaskExecutionSession} from '../../../../shared/domain/entities';
import {mapSessionRow, type SessionRow} from './rowMappers';

function calculateDurationSeconds(startedAt: string, endedAt: string): number {
  return Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
}

export class FocusSessionSqliteRepository implements FocusSessionRepository {
  constructor(private readonly db: Database.Database) {}

  getRunningByUser(userId: number): TaskExecutionSession | undefined {
    const row = this.db
      .prepare("select * from task_execution_sessions where user_id = ? and status = 'RUNNING' limit 1")
      .get(userId) as SessionRow | undefined;
    return row ? mapSessionRow(row) : undefined;
  }

  listByTask(taskId: number, userId: number): TaskExecutionSession[] {
    return (this.db
      .prepare('select * from task_execution_sessions where task_id = ? and user_id = ? order by started_at desc')
      .all(taskId, userId) as SessionRow[]).map(mapSessionRow);
  }

  listByDateRange(userId: number, startAt: string, endAt: string): TaskExecutionSession[] {
    return (this.db
      .prepare('select * from task_execution_sessions where user_id = ? and started_at >= ? and started_at <= ? order by started_at asc')
      .all(userId, startAt, endAt) as SessionRow[]).map(mapSessionRow);
  }

  createRunning(input: CreateRunningSessionInput): TaskExecutionSession {
    const startedAt = input.startedAt ?? new Date().toISOString();
    const result = this.db
      .prepare('insert into task_execution_sessions (task_id, user_id, started_at, status, created_at) values (?, ?, ?, ?, ?)')
      .run(input.taskId, input.userId, startedAt, 'RUNNING', startedAt);
    const row = this.db
      .prepare('select * from task_execution_sessions where id = ?')
      .get(Number(result.lastInsertRowid)) as SessionRow;
    return mapSessionRow(row);
  }

  stop(input: StopSessionInput): TaskExecutionSession | undefined {
    const row = this.db
      .prepare("select * from task_execution_sessions where id = ? and user_id = ? and status = 'RUNNING'")
      .get(input.sessionId, input.userId) as SessionRow | undefined;
    if (!row) {
      return undefined;
    }

    const endedAt = input.endedAt ?? new Date().toISOString();
    const durationSeconds = calculateDurationSeconds(row.started_at, endedAt);
    this.db
      .prepare("update task_execution_sessions set ended_at = ?, duration_seconds = ?, status = 'COMPLETED' where id = ? and user_id = ?")
      .run(endedAt, durationSeconds, input.sessionId, input.userId);

    const updated = this.db.prepare('select * from task_execution_sessions where id = ?').get(input.sessionId) as SessionRow;
    return mapSessionRow(updated);
  }
}
