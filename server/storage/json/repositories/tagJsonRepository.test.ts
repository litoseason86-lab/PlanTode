import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {createEmptyDatabaseSchema} from '../../databaseSchema';
import {JsonFileStore} from '../fileStore';
import {TagJsonRepository} from './tagJsonRepository';

const createdPaths: string[] = [];

function createTempFilePath(): string {
  const filePath = path.join(
    os.tmpdir(),
    `plantodo-tag-repository-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
  );
  createdPaths.push(filePath);
  return filePath;
}

afterEach(() => {
  for (const filePath of createdPaths.splice(0)) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

describe('TagJsonRepository', () => {
  it('creates and reuses json tags by normalized name', () => {
    const repository = new TagJsonRepository(new JsonFileStore(createTempFilePath()));
    const first = repository.createOrReuse({userId: 1, name: 'Foo Bar', normalizedName: 'foo bar'});
    const second = repository.createOrReuse({userId: 1, name: 'foo   bar', normalizedName: 'foo bar'});

    expect(second.id).toBe(first.id);
    expect(repository.listByUser(1)).toHaveLength(1);
  });

  it('rejects duplicate normalized names for the same user', () => {
    const repository = new TagJsonRepository(new JsonFileStore(createTempFilePath()));
    const first = repository.create({userId: 1, name: 'Foo Bar', normalizedName: 'foo bar'});
    repository.create({userId: 2, name: 'Foo Bar', normalizedName: 'foo bar'});

    expect(() => repository.create({userId: 1, name: 'foo bar', normalizedName: 'foo bar'})).toThrow(
      'Tag normalized name already exists',
    );

    const second = repository.create({userId: 1, name: 'Second', normalizedName: 'second'});
    expect(() => repository.update({
      tagId: second.id,
      userId: 1,
      name: 'Foo Bar',
      normalizedName: 'foo bar',
    })).toThrow('Tag normalized name already exists');
    expect(repository.getById(first.id, 1)).toMatchObject({name: 'Foo Bar'});
  });

  it('returns only tags owned by the requested user from getManyByIds', () => {
    const repository = new TagJsonRepository(new JsonFileStore(createTempFilePath()));
    const own = repository.createOrReuse({userId: 1, name: 'Own', normalizedName: 'own'});
    const second = repository.createOrReuse({userId: 1, name: 'Second', normalizedName: 'second'});
    const other = repository.createOrReuse({userId: 2, name: 'Other', normalizedName: 'other'});

    expect(repository.getManyByIds(1, [second.id, other.id, own.id]).map((tag) => tag.id)).toEqual([second.id, own.id]);
    expect(repository.getManyByIds(1, [])).toEqual([]);
  });

  it('updates and looks up tags by normalized name', () => {
    const repository = new TagJsonRepository(new JsonFileStore(createTempFilePath()));
    const tag = repository.create({userId: 1, name: '客户A', normalizedName: '客户a'});

    expect(repository.getById(tag.id, 1)).toMatchObject({id: tag.id, name: '客户A'});
    expect(repository.getByNormalizedName(1, '客户a')).toMatchObject({id: tag.id});
    expect(repository.update({tagId: tag.id, userId: 1, name: '客户B', normalizedName: '客户b'})).toMatchObject({
      id: tag.id,
      name: '客户B',
    });
  });

  it('removes tag associations when deleting a tag', () => {
    const filePath = createTempFilePath();
    const store = new JsonFileStore(filePath);
    const schema = createEmptyDatabaseSchema();
    schema.tags = [{id: 1, userId: 1, name: '客户A', normalizedName: '客户a', createdAt: '', updatedAt: ''} as never];
    schema.taskTags = [{taskId: 1, tagId: 1, userId: 1, createdAt: ''}];
    schema.sequences.tags = 1;
    store.write(schema);

    const repository = new TagJsonRepository(store);

    expect(repository.remove(1, 1)).toBe(true);
    expect(store.read().taskTags).toEqual([]);
    expect(repository.remove(1, 1)).toBe(false);
  });
});
