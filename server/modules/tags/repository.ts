import type {Tag} from '../../../shared/domain/entities';

export interface TagNameInput {
  userId: number;
  name: string;
  normalizedName: string;
}

export interface TagRepository {
  listByUser(userId: number): Tag[];
  getById(tagId: number, userId: number): Tag | undefined;
  getManyByIds(userId: number, tagIds: number[]): Tag[];
  getByNormalizedName(userId: number, normalizedName: string): Tag | undefined;
  create(input: TagNameInput): Tag;
  createOrReuse(input: TagNameInput): Tag;
  update(input: {tagId: number; userId: number; name: string; normalizedName: string}): Tag | undefined;
  remove(tagId: number, userId: number): boolean;
}
