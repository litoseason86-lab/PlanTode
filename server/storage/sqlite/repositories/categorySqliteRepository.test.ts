import type Database from 'better-sqlite3';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {openSqliteClient} from '../sqliteClient';
import {createTestSqliteFile, type TestSqliteFile} from '../testSqlite';
import {CategorySqliteRepository} from './categorySqliteRepository';

let sqliteFile: TestSqliteFile;
let db: Database.Database;
let repository: CategorySqliteRepository;

beforeEach(() => {
  sqliteFile = createTestSqliteFile('plantodo-category-repository');
  db = openSqliteClient(sqliteFile.filePath);
  repository = new CategorySqliteRepository(db);
});

afterEach(() => {
  db.close();
  sqliteFile.cleanup();
});

describe('CategorySqliteRepository', () => {
  it('creates, lists, updates, finds by name, and removes categories', () => {
    const first = repository.create({userId: 1, name: ' 工作 ', color: '#ef4444', sortOrder: 20});
    const second = repository.create({userId: 1, name: '生活', color: '#22c55e', sortOrder: 10});

    expect(first).toMatchObject({id: 1, userId: 1, name: '工作', color: '#ef4444', sortOrder: 20});
    expect(second.id).toBe(2);
    expect(repository.existsByName(1, '工作')).toBe(true);
    expect(repository.existsByName(1, ' 工作 ')).toBe(true);
    expect(repository.existsByName(1, '不存在')).toBe(false);

    expect(repository.listByUser(1).map((category) => category.name)).toEqual(['生活', '工作']);
    expect(repository.getById(first.id, 1)?.name).toBe('工作');

    const updated = repository.update({id: first.id, userId: 1, name: '深度工作', color: '', sortOrder: 5});
    expect(updated).toMatchObject({name: '深度工作', color: '#64748b', sortOrder: 5});
    expect(repository.listByUser(1).map((category) => category.name)).toEqual(['深度工作', '生活']);

    expect(repository.remove(second.id, 1)).toBe(true);
    expect(repository.remove(999, 1)).toBe(false);
    expect(repository.listByUser(1).map((category) => category.name)).toEqual(['深度工作']);
  });
});
