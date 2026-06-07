import {afterEach, describe, expect, it} from 'vitest';

import {openSqliteClient} from './sqliteClient';
import {createTestSqliteFile, type TestSqliteFile} from './testSqlite';

let sqliteFile: TestSqliteFile | undefined;

afterEach(() => {
  sqliteFile?.cleanup();
  sqliteFile = undefined;
});

describe('openSqliteClient', () => {
  it('creates schema tables and seeds demo user', () => {
    sqliteFile = createTestSqliteFile('plantodo-sqlite-client');
    const db = openSqliteClient(sqliteFile.filePath);

    const tables = db
      .prepare("select name from sqlite_master where type = 'table' order by name")
      .all() as Array<{name: string}>;

    expect(tables.map((table) => table.name)).toEqual([
      'categories',
      'daily_reports',
      'schema_migrations',
      'tags',
      'task_execution_sessions',
      'task_tags',
      'tasks',
      'users',
      'weekly_reviews',
    ]);

    db.prepare(
      `insert into categories (id, user_id, name, color, sort_order, created_at, updated_at)
       values (1, 1, '默认', '#000', 1, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z')`,
    ).run();
    const taskColumns = db.prepare('pragma table_info(tasks)').all() as Array<{name: string; dflt_value: string | null}>;
    expect(taskColumns.map((column) => column.name)).toContain('priority');
    expect(() => db.prepare(`
      insert into tasks (id, user_id, category_id, title, priority, all_day, status, created_at, updated_at)
      values (100, 1, 1, 'bad priority', 'P5', 1, 'TODO', '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z')
    `).run()).toThrow();
    expect(db.prepare(`
      insert into tasks (id, user_id, category_id, title, all_day, status, created_at, updated_at)
      values (101, 1, 1, 'legacy default', 1, 'TODO', '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z')
    `).run().changes).toBe(1);
    expect((db.prepare('select priority from tasks where id = 101').get() as {priority: string | null}).priority).toBeNull();

    expect(db.prepare('select id, username, display_name from users where id = 1').get()).toEqual({
      id: 1,
      username: 'demo',
      display_name: 'Demo User',
    });

    expect(db.pragma('foreign_keys', {simple: true})).toBe(1);

    db.close();
  });

  it('enforces same-user tag associations', () => {
    sqliteFile = createTestSqliteFile('plantodo-sqlite-tag-fk');
    const db = openSqliteClient(sqliteFile.filePath);

    db.prepare(`insert into users (id, username, display_name, created_at) values (2, 'u2', 'U2', '2026-06-07T00:00:00.000Z')`).run();
    db.prepare(`insert into categories (id, user_id, name, color, sort_order, created_at, updated_at) values (1, 1, '默认', '#000', 1, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z')`).run();
    db.prepare(`insert into tasks (id, user_id, category_id, title, all_day, status, created_at, updated_at) values (1, 1, 1, '任务', 1, 'TODO', '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z')`).run();
    db.prepare(`insert into tags (id, user_id, name, normalized_name, created_at, updated_at) values (1, 2, '外部', '外部', '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z')`).run();

    expect(() => db.prepare(`insert into task_tags (task_id, tag_id, user_id, created_at) values (1, 1, 1, '2026-06-07T00:00:00.000Z')`).run()).toThrow();

    db.close();
  });

  it('runs migrations idempotently', () => {
    sqliteFile = createTestSqliteFile('plantodo-sqlite-idempotent');

    const first = openSqliteClient(sqliteFile.filePath);
    first.close();

    const second = openSqliteClient(sqliteFile.filePath);
    const migrations = second.prepare('select version from schema_migrations order by version').all();

    expect(migrations).toEqual([{version: 1}, {version: 2}, {version: 3}, {version: 4}, {version: 5}]);

    second.close();
  });

  it('migrates v3 task tables with execution sessions to nullable planned_date', () => {
    sqliteFile = createTestSqliteFile('plantodo-sqlite-v3-upgrade');
    const setup = openSqliteClient(sqliteFile.filePath);
    setup.prepare(
      'insert into categories (id, user_id, name, color, sort_order, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)',
    ).run(1, 1, '工作', '#ef4444', 1, '2026-06-06T00:00:00.000Z', '2026-06-06T00:00:00.000Z');
    setup.prepare(
      'insert into tasks (id, user_id, category_id, title, planned_date, status, created_at, updated_at, all_day) values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(1, 1, 1, '写方案', '2026-06-06', 'TODO', '2026-06-06T00:00:00.000Z', '2026-06-06T00:00:00.000Z', 1);
    setup.prepare(
      'insert into task_execution_sessions (id, task_id, user_id, started_at, status, created_at) values (?, ?, ?, ?, ?, ?)',
    ).run(1, 1, 1, '2026-06-06T09:00:00.000Z', 'COMPLETED', '2026-06-06T09:00:00.000Z');
    setup.prepare('delete from schema_migrations where version >= 4').run();
    setup.close();

    const migrated = openSqliteClient(sqliteFile.filePath);
    const info = migrated.prepare('pragma table_info(tasks)').all() as Array<{name: string; notnull: number}>;
    expect(info.find((column) => column.name === 'planned_date')?.notnull).toBe(0);
    expect(migrated.prepare('select task_id from task_execution_sessions where id = 1').get()).toEqual({task_id: 1});
    expect(migrated.pragma('foreign_key_check')).toEqual([]);
    migrated.close();
  });
});
