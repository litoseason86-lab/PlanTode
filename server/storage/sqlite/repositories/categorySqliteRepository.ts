import type Database from 'better-sqlite3';

import type {
  CategoryRepository,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../../../modules/categories/repository';
import type {Category} from '../../../../shared/domain/entities';
import {mapCategoryRow, type CategoryRow} from './rowMappers';

export class CategorySqliteRepository implements CategoryRepository {
  constructor(private readonly db: Database.Database) {}

  listByUser(userId: number): Category[] {
    return (this.db
      .prepare('select * from categories where user_id = ? order by sort_order asc, name asc')
      .all(userId) as CategoryRow[]).map(mapCategoryRow);
  }

  getById(id: number, userId: number): Category | undefined {
    const row = this.db
      .prepare('select * from categories where id = ? and user_id = ?')
      .get(id, userId) as CategoryRow | undefined;
    return row ? mapCategoryRow(row) : undefined;
  }

  existsByName(userId: number, name: string): boolean {
    const normalizedName = name.trim().toLowerCase();
    const row = this.db
      .prepare('select id from categories where user_id = ? and lower(trim(name)) = ? limit 1')
      .get(userId, normalizedName);
    return Boolean(row);
  }

  create(input: CreateCategoryInput): Category {
    const now = new Date().toISOString();
    const result = this.db
      .prepare('insert into categories (user_id, name, color, sort_order, created_at, updated_at) values (?, ?, ?, ?, ?, ?)')
      .run(input.userId, input.name.trim(), input.color || '#64748b', input.sortOrder, now, now);
    return this.getById(Number(result.lastInsertRowid), input.userId)!;
  }

  update(input: UpdateCategoryInput): Category | undefined {
    const now = new Date().toISOString();
    const result = this.db
      .prepare('update categories set name = ?, color = ?, sort_order = ?, updated_at = ? where id = ? and user_id = ?')
      .run(input.name.trim(), input.color || '#64748b', input.sortOrder, now, input.id, input.userId);
    if (result.changes === 0) {
      return undefined;
    }
    return this.getById(input.id, input.userId);
  }

  remove(id: number, userId: number): boolean {
    return this.db.prepare('delete from categories where id = ? and user_id = ?').run(id, userId).changes > 0;
  }
}
