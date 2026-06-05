import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import {runMigrations} from './migrations';

export function openSqliteClient(filePath: string): Database.Database {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, {recursive: true});
  }

  const db = new Database(filePath);
  db.pragma('foreign_keys = ON');
  runMigrations(db);

  return db;
}
