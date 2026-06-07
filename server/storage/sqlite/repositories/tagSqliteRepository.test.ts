import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {openSqliteClient} from '../sqliteClient';
import {createTestSqliteFile, type TestSqliteFile} from '../testSqlite';
import {TagSqliteRepository} from './tagSqliteRepository';

let sqliteFile: TestSqliteFile | undefined;
let db: ReturnType<typeof openSqliteClient>;

beforeEach(() => {
  sqliteFile = createTestSqliteFile('plantodo-tag-sqlite-repository');
  db = openSqliteClient(sqliteFile.filePath);
});

afterEach(() => {
  db.close();
  sqliteFile?.cleanup();
  sqliteFile = undefined;
});

describe('TagSqliteRepository', () => {
  it('creates and reuses sqlite tags by normalized name', () => {
    const tags = new TagSqliteRepository(db);
    const first = tags.createOrReuse({userId: 1, name: 'Foo Bar', normalizedName: 'foo bar'});
    const second = tags.createOrReuse({userId: 1, name: 'foo   bar', normalizedName: 'foo bar'});

    expect(second.id).toBe(first.id);
    expect(tags.listByUser(1)).toHaveLength(1);
  });

  it('rejects duplicate normalized names for the same user', () => {
    const tags = new TagSqliteRepository(db);
    const first = tags.create({userId: 1, name: 'Foo Bar', normalizedName: 'foo bar'});
    db.prepare(`insert into users (id, username, display_name, created_at) values (2, 'u2', 'U2', '2026-06-07T00:00:00.000Z')`).run();
    tags.create({userId: 2, name: 'Foo Bar', normalizedName: 'foo bar'});

    expect(() => tags.create({userId: 1, name: 'foo bar', normalizedName: 'foo bar'})).toThrow();

    const second = tags.create({userId: 1, name: 'Second', normalizedName: 'second'});
    expect(() => tags.update({
      tagId: second.id,
      userId: 1,
      name: 'Foo Bar',
      normalizedName: 'foo bar',
    })).toThrow();
    expect(tags.getById(first.id, 1)).toMatchObject({name: 'Foo Bar'});
  });

  it('returns only tags owned by the requested user from getManyByIds', () => {
    db.prepare(`insert into users (id, username, display_name, created_at) values (2, 'u2', 'U2', '2026-06-07T00:00:00.000Z')`).run();
    const tags = new TagSqliteRepository(db);
    const own = tags.createOrReuse({userId: 1, name: 'Own', normalizedName: 'own'});
    const second = tags.createOrReuse({userId: 1, name: 'Second', normalizedName: 'second'});
    const other = tags.createOrReuse({userId: 2, name: 'Other', normalizedName: 'other'});

    expect(tags.getManyByIds(1, [second.id, other.id, own.id]).map((tag) => tag.id)).toEqual([second.id, own.id]);
    expect(tags.getManyByIds(1, [])).toEqual([]);
  });

  it('updates and looks up tags by normalized name', () => {
    const tags = new TagSqliteRepository(db);
    const tag = tags.create({userId: 1, name: '客户A', normalizedName: '客户a'});

    expect(tags.getById(tag.id, 1)).toMatchObject({id: tag.id, name: '客户A'});
    expect(tags.getByNormalizedName(1, '客户a')).toMatchObject({id: tag.id});
    expect(tags.update({tagId: tag.id, userId: 1, name: '客户B', normalizedName: '客户b'})).toMatchObject({
      id: tag.id,
      name: '客户B',
    });
  });

  it('removes tag associations when deleting a tag', () => {
    const tags = new TagSqliteRepository(db);
    const tag = tags.createOrReuse({userId: 1, name: '客户A', normalizedName: '客户a'});
    db.prepare(`insert into categories (id, user_id, name, color, sort_order, created_at, updated_at) values (1, 1, '默认', '#000', 1, '', '')`).run();
    db.prepare(`insert into tasks (id, user_id, category_id, title, all_day, status, created_at, updated_at) values (1, 1, 1, '任务', 1, 'TODO', '', '')`).run();
    db.prepare(`insert into task_tags (task_id, tag_id, user_id, created_at) values (1, ?, 1, '')`).run(tag.id);

    expect(tags.remove(tag.id, 1)).toBe(true);
    expect(db.prepare('select count(*) as count from task_tags where tag_id = ?').get(tag.id)).toEqual({count: 0});
    expect(tags.remove(tag.id, 1)).toBe(false);
  });
});
