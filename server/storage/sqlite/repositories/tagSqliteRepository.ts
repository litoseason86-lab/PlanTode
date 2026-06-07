import type Database from 'better-sqlite3';

import type {Tag} from '../../../../shared/domain/entities';
import type {TagNameInput, TagRepository} from '../../../modules/tags/repository';

interface TagRow {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

function mapTagRow(row: TagRow): Tag {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TagSqliteRepository implements TagRepository {
  constructor(private readonly db: Database.Database) {}

  listByUser(userId: number): Tag[] {
    return (this.db
      .prepare('select id, user_id, name, created_at, updated_at from tags where user_id = ? order by name asc')
      .all(userId) as TagRow[]).map(mapTagRow);
  }

  getById(tagId: number, userId: number): Tag | undefined {
    const row = this.db
      .prepare('select id, user_id, name, created_at, updated_at from tags where id = ? and user_id = ?')
      .get(tagId, userId) as TagRow | undefined;
    return row ? mapTagRow(row) : undefined;
  }

  getManyByIds(userId: number, tagIds: number[]): Tag[] {
    if (tagIds.length === 0) {
      return [];
    }

    const placeholders = tagIds.map(() => '?').join(', ');
    const rows = this.db
      .prepare(`select id, user_id, name, created_at, updated_at from tags where user_id = ? and id in (${placeholders})`)
      .all(userId, ...tagIds) as TagRow[];
    const byId = new Map(rows.map((row) => [row.id, row] as const));

    return tagIds.flatMap((tagId) => {
      const row = byId.get(tagId);
      return row ? [mapTagRow(row)] : [];
    });
  }

  getByNormalizedName(userId: number, normalizedName: string): Tag | undefined {
    const row = this.db
      .prepare('select id, user_id, name, created_at, updated_at from tags where user_id = ? and normalized_name = ?')
      .get(userId, normalizedName) as TagRow | undefined;
    return row ? mapTagRow(row) : undefined;
  }

  create(input: TagNameInput): Tag {
    const now = new Date().toISOString();
    const result = this.db
      .prepare('insert into tags (user_id, name, normalized_name, created_at, updated_at) values (?, ?, ?, ?, ?)')
      .run(input.userId, input.name, input.normalizedName, now, now);
    return this.getById(Number(result.lastInsertRowid), input.userId)!;
  }

  createOrReuse(input: TagNameInput): Tag {
    return this.getByNormalizedName(input.userId, input.normalizedName) ?? this.create(input);
  }

  update(input: {tagId: number; userId: number; name: string; normalizedName: string}): Tag | undefined {
    const now = new Date().toISOString();
    const result = this.db
      .prepare('update tags set name = ?, normalized_name = ?, updated_at = ? where id = ? and user_id = ?')
      .run(input.name, input.normalizedName, now, input.tagId, input.userId);
    if (result.changes === 0) {
      return undefined;
    }
    return this.getById(input.tagId, input.userId);
  }

  remove(tagId: number, userId: number): boolean {
    const removeTag = this.db.transaction(() => {
      this.db.prepare('delete from task_tags where tag_id = ? and user_id = ?').run(tagId, userId);
      return this.db.prepare('delete from tags where id = ? and user_id = ?').run(tagId, userId).changes > 0;
    });

    return removeTag();
  }
}
