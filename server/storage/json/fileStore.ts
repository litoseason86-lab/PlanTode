import fs from 'node:fs';
import path from 'node:path';

import {
  createEmptyDatabaseSchema,
  type DatabaseSequences,
  type DatabaseSchema,
  type StoredTask,
} from '../databaseSchema';

type DatabaseSchemaInput = Partial<Omit<DatabaseSchema, 'sequences'>> & {
  sequences?: Partial<DatabaseSequences>;
};

function normalizeTasks(tasks: StoredTask[] | undefined): StoredTask[] {
  return (tasks ?? []).map((task) => ({
    ...task,
    priority: task.priority ?? null,
    tagIds: task.tagIds ?? [],
  }));
}

function normalizeSchema(data: DatabaseSchemaInput): DatabaseSchema {
  const base = createEmptyDatabaseSchema();

  return {
    ...base,
    ...data,
    users: data.users ?? base.users,
    categories: data.categories ?? base.categories,
    tags: data.tags ?? base.tags,
    taskTags: data.taskTags ?? base.taskTags,
    tasks: normalizeTasks(data.tasks ?? base.tasks),
    taskExecutionSessions: data.taskExecutionSessions ?? base.taskExecutionSessions,
    dailyReports: data.dailyReports ?? base.dailyReports,
    weeklyReviews: data.weeklyReviews ?? base.weeklyReviews,
    sequences: {
      ...base.sequences,
      ...(data.sequences ?? {}),
    },
  };
}

export class JsonFileStore {
  constructor(private readonly filePath: string) {}

  private ensureFile(): void {
    const directory = path.dirname(this.filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, {recursive: true});
    }

    if (!fs.existsSync(this.filePath)) {
      this.write(createEmptyDatabaseSchema());
    }
  }

  read(): DatabaseSchema {
    this.ensureFile();

    const raw = fs.readFileSync(this.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;

    return normalizeSchema(parsed);
  }

  write(data: DatabaseSchemaInput): void {
    const directory = path.dirname(this.filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, {recursive: true});
    }

    fs.writeFileSync(this.filePath, JSON.stringify(normalizeSchema(data), null, 2), 'utf-8');
  }

  update<T>(mutator: (data: DatabaseSchema) => T): T {
    const data = this.read();
    const result = mutator(data);
    this.write(data);
    return result;
  }
}
