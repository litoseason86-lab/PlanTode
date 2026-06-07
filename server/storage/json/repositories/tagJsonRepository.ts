import type {Tag} from '../../../../shared/domain/entities';
import type {TagNameInput, TagRepository} from '../../../modules/tags/repository';
import type {StoredTag} from '../../databaseSchema';
import {JsonFileStore} from '../fileStore';

function toTag(tag: StoredTag): Tag {
  return {
    id: tag.id,
    userId: tag.userId,
    name: tag.name,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}

function hasDuplicateNormalizedName(
  tags: StoredTag[],
  input: {userId: number; normalizedName: string; tagId?: number},
): boolean {
  return tags.some((tag) => {
    return tag.userId === input.userId
      && tag.normalizedName === input.normalizedName
      && tag.id !== input.tagId;
  });
}

export class TagJsonRepository implements TagRepository {
  constructor(private readonly store: JsonFileStore) {}

  listByUser(userId: number): Tag[] {
    return this.store
      .read()
      .tags.filter((tag) => tag.userId === userId)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(toTag);
  }

  getById(tagId: number, userId: number): Tag | undefined {
    const tag = this.store.read().tags.find((item) => item.id === tagId && item.userId === userId);
    return tag ? toTag(tag) : undefined;
  }

  getManyByIds(userId: number, tagIds: number[]): Tag[] {
    if (tagIds.length === 0) {
      return [];
    }

    const byId = new Map(
      this.store
        .read()
        .tags.filter((tag) => tag.userId === userId && tagIds.includes(tag.id))
        .map((tag) => [tag.id, tag] as const),
    );

    return tagIds.flatMap((tagId) => {
      const tag = byId.get(tagId);
      return tag ? [toTag(tag)] : [];
    });
  }

  getByNormalizedName(userId: number, normalizedName: string): Tag | undefined {
    const tag = this.store.read().tags.find((item) => {
      return item.userId === userId && item.normalizedName === normalizedName;
    });
    return tag ? toTag(tag) : undefined;
  }

  create(input: TagNameInput): Tag {
    return this.store.update((data) => {
      if (hasDuplicateNormalizedName(data.tags, input)) {
        throw new Error('Tag normalized name already exists');
      }

      data.sequences.tags = (data.sequences.tags ?? 0) + 1;
      const now = new Date().toISOString();
      const tag: StoredTag = {
        id: data.sequences.tags,
        userId: input.userId,
        name: input.name,
        normalizedName: input.normalizedName,
        createdAt: now,
        updatedAt: now,
      };
      data.tags.push(tag);
      return toTag(tag);
    });
  }

  createOrReuse(input: TagNameInput): Tag {
    return this.getByNormalizedName(input.userId, input.normalizedName) ?? this.create(input);
  }

  update(input: {tagId: number; userId: number; name: string; normalizedName: string}): Tag | undefined {
    return this.store.update((data) => {
      const tag = data.tags.find((item) => item.id === input.tagId && item.userId === input.userId);
      if (!tag) {
        return undefined;
      }
      if (hasDuplicateNormalizedName(data.tags, input)) {
        throw new Error('Tag normalized name already exists');
      }

      tag.name = input.name;
      tag.normalizedName = input.normalizedName;
      tag.updatedAt = new Date().toISOString();
      return toTag(tag);
    });
  }

  remove(tagId: number, userId: number): boolean {
    return this.store.update((data) => {
      const index = data.tags.findIndex((tag) => tag.id === tagId && tag.userId === userId);
      if (index === -1) {
        return false;
      }

      data.taskTags = data.taskTags.filter((taskTag) => {
        return !(taskTag.tagId === tagId && taskTag.userId === userId);
      });
      data.tags.splice(index, 1);
      return true;
    });
  }
}
