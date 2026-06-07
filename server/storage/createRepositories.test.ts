import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {afterEach, describe, expect, it, vi} from 'vitest';

import {createRepositoriesFromEnv} from './createRepositories';
import {createTestSqliteFile, type TestSqliteFile} from './sqlite/testSqlite';

let sqliteFile: TestSqliteFile | undefined;
let jsonFile: TestSqliteFile | undefined;
let projectDirectory: string | undefined;
const originalCwd = process.cwd();

function useTemporaryProjectDirectory(): {canonicalSqlitePath: string; legacySqlitePath: string} {
  projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'plantodo-project-'));
  process.chdir(projectDirectory);

  return {
    canonicalSqlitePath: path.join(projectDirectory, 'data', 'plantodo.sqlite'),
    legacySqlitePath: path.join(projectDirectory, 'data', 'plantode.sqlite'),
  };
}

afterEach(() => {
  process.chdir(originalCwd);
  sqliteFile?.cleanup();
  jsonFile?.cleanup();
  if (projectDirectory) {
    fs.rmSync(projectDirectory, {recursive: true, force: true});
  }
  sqliteFile = undefined;
  jsonFile = undefined;
  projectDirectory = undefined;
  vi.unstubAllEnvs();
});

describe('createRepositoriesFromEnv', () => {
  it('defaults to sqlite repositories', () => {
    sqliteFile = createTestSqliteFile('plantodo-default-sqlite-factory');
    vi.stubEnv('SQLITE_DB_PATH', sqliteFile.filePath);

    const repositories = createRepositoriesFromEnv();

    expect(repositories.categories.constructor.name).toBe('CategorySqliteRepository');
    expect(repositories.tags.constructor.name).toBe('TagSqliteRepository');
    expect(repositories.tasks.constructor.name).toBe('TaskSqliteRepository');
    expect(repositories.focusSessions.constructor.name).toBe('FocusSessionSqliteRepository');
    expect(repositories.reports.constructor.name).toBe('ReportSqliteRepository');
  });

  it('creates sqlite repositories when STORAGE_DRIVER is sqlite', () => {
    sqliteFile = createTestSqliteFile('plantodo-repository-factory');
    vi.stubEnv('STORAGE_DRIVER', 'sqlite');
    vi.stubEnv('SQLITE_DB_PATH', sqliteFile.filePath);

    const repositories = createRepositoriesFromEnv();

    expect(repositories.categories.constructor.name).toBe('CategorySqliteRepository');
    expect(repositories.tags.constructor.name).toBe('TagSqliteRepository');
    expect(repositories.tasks.constructor.name).toBe('TaskSqliteRepository');
    expect(repositories.focusSessions.constructor.name).toBe('FocusSessionSqliteRepository');
    expect(repositories.reports.constructor.name).toBe('ReportSqliteRepository');
  });

  it('uses plantodo.sqlite as the canonical default sqlite database', () => {
    const {canonicalSqlitePath, legacySqlitePath} = useTemporaryProjectDirectory();

    createRepositoriesFromEnv({STORAGE_DRIVER: 'sqlite'});

    expect(fs.existsSync(canonicalSqlitePath)).toBe(true);
    expect(fs.existsSync(legacySqlitePath)).toBe(false);
  });

  it('keeps using a legacy plantode.sqlite database when it is the only default database present', () => {
    const {canonicalSqlitePath, legacySqlitePath} = useTemporaryProjectDirectory();
    fs.mkdirSync(path.dirname(legacySqlitePath), {recursive: true});
    fs.writeFileSync(legacySqlitePath, '');

    createRepositoriesFromEnv({STORAGE_DRIVER: 'sqlite'});

    expect(fs.existsSync(legacySqlitePath)).toBe(true);
    expect(fs.existsSync(canonicalSqlitePath)).toBe(false);
  });

  it('creates json repositories when STORAGE_DRIVER is json', () => {
    jsonFile = createTestSqliteFile('plantodo-json-factory');
    vi.stubEnv('STORAGE_DRIVER', 'json');
    vi.stubEnv('JSON_DB_PATH', jsonFile.filePath);

    const repositories = createRepositoriesFromEnv();

    expect(repositories.categories.constructor.name).toBe('CategoryJsonRepository');
    expect(repositories.tags.constructor.name).toBe('TagJsonRepository');
    expect(repositories.tasks.constructor.name).toBe('TaskJsonRepository');
    expect(repositories.focusSessions.constructor.name).toBe('FocusSessionJsonRepository');
    expect(repositories.reports.constructor.name).toBe('ReportJsonRepository');
  });

  it('rejects unknown storage drivers', () => {
    vi.stubEnv('STORAGE_DRIVER', 'postgres');

    expect(() => createRepositoriesFromEnv()).toThrow('Unsupported STORAGE_DRIVER "postgres"');
  });
});
