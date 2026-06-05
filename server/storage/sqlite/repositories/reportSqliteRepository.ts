import type Database from 'better-sqlite3';

import type {ReportRepository} from '../../../modules/reports/repository';
import type {DailyReport, WeeklyReview} from '../../../../shared/domain/entities';
import {mapDailyReportRow, mapWeeklyReviewRow, type DailyReportRow, type WeeklyReviewRow} from './rowMappers';

export class ReportSqliteRepository implements ReportRepository {
  constructor(private readonly db: Database.Database) {}

  getDaily(userId: number, reportDate: string): DailyReport | undefined {
    const row = this.db
      .prepare('select * from daily_reports where user_id = ? and report_date = ?')
      .get(userId, reportDate) as DailyReportRow | undefined;
    return row ? mapDailyReportRow(row) : undefined;
  }

  saveDaily(userId: number, reportDate: string, content: string): DailyReport {
    const now = new Date().toISOString();
    this.db
      .prepare(`
        insert into daily_reports (user_id, report_date, content, generator_type, created_at, updated_at)
        values (?, ?, ?, 'RULE_BASED', ?, ?)
        on conflict(user_id, report_date) do update set content = excluded.content, updated_at = excluded.updated_at
      `)
      .run(userId, reportDate, content, now, now);
    return this.getDaily(userId, reportDate)!;
  }

  getWeekly(userId: number, weekStartDate: string): WeeklyReview | undefined {
    const row = this.db
      .prepare('select * from weekly_reviews where user_id = ? and week_start_date = ?')
      .get(userId, weekStartDate) as WeeklyReviewRow | undefined;
    return row ? mapWeeklyReviewRow(row) : undefined;
  }

  saveWeekly(userId: number, weekStartDate: string, weekEndDate: string, content: string): WeeklyReview {
    const now = new Date().toISOString();
    this.db
      .prepare(`
        insert into weekly_reviews (user_id, week_start_date, week_end_date, content, generator_type, created_at, updated_at)
        values (?, ?, ?, ?, 'RULE_BASED', ?, ?)
        on conflict(user_id, week_start_date) do update set
          week_end_date = excluded.week_end_date,
          content = excluded.content,
          updated_at = excluded.updated_at
      `)
      .run(userId, weekStartDate, weekEndDate, content, now, now);
    return this.getWeekly(userId, weekStartDate)!;
  }
}
