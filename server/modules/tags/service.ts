import {AppError} from '../../shared/errors/appError';
import type {TagRepository} from './repository';
import {normalizeTagName} from './schemas';

export class TagsService {
  constructor(private readonly tags: TagRepository) {}

  list(userId: number) {
    return this.tags.listByUser(userId);
  }

  create(input: {userId: number; name: string}) {
    const normalized = normalizeTagName(input.name);
    return this.tags.createOrReuse({userId: input.userId, ...normalized});
  }

  update(input: {tagId: number; userId: number; name: string}) {
    const normalized = normalizeTagName(input.name);
    const existing = this.tags.getByNormalizedName(input.userId, normalized.normalizedName);
    if (existing && existing.id !== input.tagId) {
      throw new AppError(409, 'Another tag with this name already exists.');
    }

    const updated = this.tags.update({tagId: input.tagId, userId: input.userId, ...normalized});
    if (!updated) {
      throw new AppError(404, 'Tag not found');
    }

    return updated;
  }

  delete(tagId: number, userId: number) {
    if (!this.tags.remove(tagId, userId)) {
      throw new AppError(404, 'Tag not found');
    }
  }
}
