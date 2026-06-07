import type {
  Category,
  DailyReport,
  Tag,
  TaskTag,
  Task,
  TaskExecutionSession,
  User,
  WeeklyReview,
} from '../../shared/domain/entities';
import type {TaskPriority} from '../../shared/domain/status';

export type StoredTag = Tag & {
  normalizedName: string;
};

export type StoredTask = Task & {
  priority?: TaskPriority | null;
  tagIds?: number[];
};

export interface DatabaseSequences {
  categories: number;
  tags: number;
  tasks: number;
  taskExecutionSessions: number;
  dailyReports: number;
  weeklyReviews: number;
}

export interface DatabaseSchema {
  users: User[];
  categories: Category[];
  tags: StoredTag[];
  taskTags: TaskTag[];
  tasks: StoredTask[];
  taskExecutionSessions: TaskExecutionSession[];
  dailyReports: DailyReport[];
  weeklyReviews: WeeklyReview[];
  sequences: DatabaseSequences;
}

export function createEmptyDatabaseSchema(): DatabaseSchema {
  return {
    users: [],
    categories: [],
    tags: [],
    taskTags: [],
    tasks: [],
    taskExecutionSessions: [],
    dailyReports: [],
    weeklyReviews: [],
    sequences: {
      categories: 0,
      tags: 0,
      tasks: 0,
      taskExecutionSessions: 0,
      dailyReports: 0,
      weeklyReviews: 0,
    },
  };
}
