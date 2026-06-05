import {Router} from 'express';

import {handleHttpError} from '../../shared/http/handleHttpError';
import {parseDailyBodyDate, parseDailyDate, parseWeekStart} from './schemas';
import {ReportsService} from './service';

const DEMO_USER_ID = 1;

export function buildReportRoutes(service: ReportsService): Router {
  const router = Router();

  router.get('/daily-reports', (req, res) => {
    try {
      const date = parseDailyDate(req.query.date);
      res.json(service.getDaily(DEMO_USER_ID, date));
    } catch (error) {
      handleHttpError(res, error);
    }
  });

  router.post('/daily-reports/generate', (req, res) => {
    try {
      const date = parseDailyBodyDate((req.body as Record<string, unknown>)?.date);
      res.json(service.generateDaily(DEMO_USER_ID, date));
    } catch (error) {
      handleHttpError(res, error);
    }
  });

  router.get('/weekly-reviews', (req, res) => {
    try {
      const weekStart = parseWeekStart(req.query.weekStart, 'query');
      res.json(service.getWeekly(DEMO_USER_ID, weekStart));
    } catch (error) {
      handleHttpError(res, error);
    }
  });

  router.post('/weekly-reviews/generate', (req, res) => {
    try {
      const weekStart = parseWeekStart((req.body as Record<string, unknown>)?.weekStart, 'body');
      res.json(service.generateWeekly(DEMO_USER_ID, weekStart));
    } catch (error) {
      handleHttpError(res, error);
    }
  });

  return router;
}

