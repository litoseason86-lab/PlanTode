import type {DailyReport, WeeklyReview} from '../../../../shared/domain/entities';
import {requestJson} from '../../../shared/api/httpClient';

export const reportsApi = {
  getDailyReport(date: string): Promise<DailyReport> {
    return requestJson<DailyReport>(`/api/daily-reports?date=${date}`);
  },

  generateDailyReport(date: string): Promise<DailyReport> {
    return requestJson<DailyReport>('/api/daily-reports/generate', {
      method: 'POST',
      body: JSON.stringify({date}),
    });
  },

  getWeeklyReview(weekStart: string): Promise<WeeklyReview> {
    return requestJson<WeeklyReview>(`/api/weekly-reviews?weekStart=${weekStart}`);
  },

  generateWeeklyReview(weekStart: string): Promise<WeeklyReview> {
    return requestJson<WeeklyReview>('/api/weekly-reviews/generate', {
      method: 'POST',
      body: JSON.stringify({weekStart}),
    });
  },
};
