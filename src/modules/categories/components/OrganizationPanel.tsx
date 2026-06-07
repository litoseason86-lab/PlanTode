import {Edit3, Plus, Save, Trash2, X} from 'lucide-react';
import {useState} from 'react';

import type {Category, Tag} from '../../../../shared/domain/entities';
import {getErrorMessage} from '../../../app/errors';
import {CategorySection, type CategoryController} from './CategoryPanel';

interface OrganizationStyleContext {
  primary: string;
  primaryLight: string;
}

interface OrganizationPanelProps {
  categories: Category[];
  tags: Tag[];
  categoryController: Omit<CategoryController, 'categories'>;
  tagController: TagController;
  styleContext: OrganizationStyleContext;
}

interface TagsSectionProps {
  tags: Tag[];
  controller: TagController;
  styleContext: OrganizationStyleContext;
}

export interface TagController {
  createTag: (name: string) => Promise<unknown>;
  updateTag: (id: number, name: string) => Promise<unknown>;
  deleteTag: (id: number) => Promise<unknown>;
}

export function OrganizationPanel({
  categories,
  tags,
  categoryController,
  tagController,
  styleContext,
}: OrganizationPanelProps) {
  return (
    <div className="space-y-8" id="organization_view">
      <section className="space-y-4" aria-labelledby="organization_categories_title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="organization_categories_title" className="text-base font-extrabold text-slate-800">分类</h2>
            <p className="text-xs text-slate-500 font-medium">维护任务的主分组、颜色和排序权重。</p>
          </div>
        </div>
        <CategorySection controller={{...categoryController, categories}} styleContext={styleContext} />
      </section>

      <section className="space-y-4" aria-labelledby="organization_tags_title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="organization_tags_title" className="text-base font-extrabold text-slate-800">标签</h2>
            <p className="text-xs text-slate-500 font-medium">维护可叠加到任务上的轻量标记。</p>
          </div>
        </div>
        <TagsSection tags={tags} controller={tagController} styleContext={styleContext} />
      </section>
    </div>
  );
}

function TagsSection({tags, controller, styleContext}: TagsSectionProps) {
  const [newTagName, setNewTagName] = useState('');
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const isCreating = pendingAction === 'create';

  const handleCreateTag = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newTagName.trim();
    if (!name || pendingAction) {
      return;
    }

    setPendingAction('create');
    setErrorMessage('');
    try {
      await controller.createTag(name);
      setNewTagName('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '创建标签失败'));
    } finally {
      setPendingAction(null);
    }
  };

  const startRename = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingName(tag.name);
  };

  const cancelRename = () => {
    setEditingTagId(null);
    setEditingName('');
  };

  const saveRename = async (tagId: number) => {
    const name = editingName.trim();
    if (!name || pendingAction) {
      return;
    }

    setPendingAction(`rename:${tagId}`);
    setErrorMessage('');
    try {
      await controller.updateTag(tagId, name);
      cancelRename();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '保存标签失败'));
    } finally {
      setPendingAction(null);
    }
  };

  const deleteTag = async (tag: Tag) => {
    if (pendingAction || !window.confirm(`删除标签「${tag.name}」？任务会保留，只会移除这个标签关联。`)) {
      return;
    }

    setPendingAction(`delete:${tag.id}`);
    setErrorMessage('');
    try {
      await controller.deleteTag(tag.id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '删除标签失败'));
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] space-y-4">
      <form onSubmit={handleCreateTag} className="flex flex-col sm:flex-row gap-2">
        <label className="sr-only" htmlFor="new_tag_name">新标签</label>
        <input
          id="new_tag_name"
          type="text"
          value={newTagName}
          onChange={(event) => setNewTagName(event.target.value)}
          placeholder="输入标签名称"
          className="flex-1 text-xs border border-slate-200 bg-slate-50/50 p-2.5 text-slate-800 rounded-xl outline-none focus:border-[var(--color-primary)] focus:bg-white font-semibold transition-all"
        />
        <button
          type="submit"
          disabled={isCreating}
          className="text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-md active:scale-[0.98]"
          style={{backgroundColor: styleContext.primary}}
        >
          <Plus className="w-3.5 h-3.5" />
          新增标签
        </button>
      </form>
      {errorMessage && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
        {tags.length === 0 ? (
          <div className="px-4 py-5 text-xs font-semibold text-slate-400 bg-slate-50/60">暂无标签</div>
        ) : tags.map((tag) => (
          <div key={tag.id} className="px-4 py-3 bg-white flex items-center justify-between gap-3">
            {editingTagId === tag.id ? (
              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                <label className="sr-only" htmlFor={`tag_name_${tag.id}`}>标签名称</label>
                <input
                  id={`tag_name_${tag.id}`}
                  type="text"
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  className="flex-1 text-xs border border-slate-200 bg-slate-50/50 p-2.5 text-slate-800 rounded-xl outline-none focus:border-[var(--color-primary)] focus:bg-white font-semibold transition-all"
                  autoFocus
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void saveRename(tag.id)}
                    disabled={pendingAction === `rename:${tag.id}`}
                    className="text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 active:scale-[0.98]"
                    style={{backgroundColor: styleContext.primary}}
                  >
                    <Save className="w-3.5 h-3.5" />
                    保存标签
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    disabled={pendingAction === `rename:${tag.id}`}
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition"
                    aria-label={`取消重命名标签 ${tag.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                  {tag.name}
                </span>
                <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => startRename(tag)}
                    className="p-1.5 hover:bg-white text-slate-500 rounded-md transition shadow-sm"
                    aria-label={`重命名标签 ${tag.name}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteTag(tag)}
                    disabled={pendingAction === `delete:${tag.id}`}
                    className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-md transition"
                    aria-label={`删除标签 ${tag.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
