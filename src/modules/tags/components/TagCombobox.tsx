import {useId, useMemo, useRef, useState} from 'react';

import type {Tag} from '../../../../shared/domain/entities';
import {normalizedTagKey, normalizeTagInput} from '../controllers/tagName';

interface TagComboboxProps {
  tags: Tag[];
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
  onCreateTag: (name: string) => Promise<Tag>;
  label?: string;
}

export function TagCombobox({
  tags,
  selectedTagIds,
  onChange,
  onCreateTag,
  label = '标签',
}: TagComboboxProps) {
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const isCreatingRef = useRef(false);
  const selectedTagIdsRef = useRef(selectedTagIds);
  selectedTagIdsRef.current = selectedTagIds;
  const inputId = useId();
  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [selectedTagIds, tags],
  );

  const selectTag = (tag: Tag) => {
    const currentSelectedTagIds = selectedTagIdsRef.current;
    if (!currentSelectedTagIds.includes(tag.id)) {
      onChange([...currentSelectedTagIds, tag.id]);
    }
    setInputValue('');
  };

  const handleEnter = async () => {
    const name = normalizeTagInput(inputValue);
    if (!name || isCreatingRef.current) {
      return;
    }

    const match = tags.find((tag) => normalizedTagKey(tag.name) === normalizedTagKey(name));
    if (match) {
      selectTag(match);
      return;
    }

    isCreatingRef.current = true;
    setIsCreating(true);
    try {
      const created = await onCreateTag(name);
      const currentSelectedTagIds = selectedTagIdsRef.current;
      if (!currentSelectedTagIds.includes(created.id)) {
        onChange([...currentSelectedTagIds, created.id]);
      }
      setInputValue('');
    } catch {
      // Keep the typed value so the user can retry or edit it.
    } finally {
      isCreatingRef.current = false;
      setIsCreating(false);
    }
  };

  const removeTag = (tagId: number) => {
    onChange(selectedTagIds.filter((selectedId) => selectedId !== tagId));
  };

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
        {label}
      </label>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
            >
              {tag.name}
              <button
                type="button"
                aria-label={`移除标签 ${tag.name}`}
                onClick={() => removeTag(tag.id)}
                className="text-slate-400 hover:text-slate-700"
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        id={inputId}
        role="combobox"
        aria-expanded={false}
        type="text"
        value={inputValue}
        disabled={isCreating}
        onChange={(event) => setInputValue(event.target.value)}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || isComposing || event.nativeEvent.isComposing) {
            return;
          }
          event.preventDefault();
          void handleEnter();
        }}
        className="w-full text-xs border border-slate-200 bg-white p-2.5 rounded-md outline-none font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      />
    </div>
  );
}
