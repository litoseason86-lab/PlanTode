import type Database from 'better-sqlite3';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {openSqliteClient} from '../sqliteClient';
import {createTestSqliteFile, type TestSqliteFile} from '../testSqlite';
import {ReportSqliteRepository} from './reportSqliteRepository';

let sqliteFile: TestSqliteFile;
let db: Database.Database;
let reports: ReportSqliteRepository;

beforeEach(() => {
  sqliteFile = createTestSqliteFile('plantodo-report-repository');
  db = openSqliteClient(sqliteFile.filePath);
  reports = new ReportSqliteRepository(db);
});

afterEach(() => {
  db.close();
  sqliteFile.cleanup();
});

describe('ReportSqliteRepository', () => {
  it('saves and updates daily reports', () => {
    const created = reports.saveDaily(1, '2026-06-05', 'first daily');
    const updated = reports.saveDaily(1, '2026-06-05', 'second daily');

    expect(created.id).toBe(updated.id);
    expect(updated.content).toBe('second daily');
    expect(reports.getDaily(1, '2026-06-05')?.content).toBe('second daily');
  });

  it('saves and updates weekly reviews', () => {
    const created = reports.saveWeekly(1, '2026-06-01', '2026-06-07', 'first weekly');
    const updated = reports.saveWeekly(1, '2026-06-01', '2026-06-08', 'second weekly');

    expect(created.id).toBe(updated.id);
    expect(updated.weekEndDate).toBe('2026-06-08');
    expect(reports.getWeekly(1, '2026-06-01')?.content).toBe('second weekly');
  });
});
