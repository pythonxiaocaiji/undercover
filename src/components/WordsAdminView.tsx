import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import {
  WordCategoryDto,
  WordPairDto,
  adminCreateWordCategory,
  adminCreateWordPair,
  adminDeleteWordCategory,
  adminDeleteWordPair,
  listWordCategories,
  listWordPairs,
} from '../services/backend';

/* ---------- Custom confirm dialog ---------- */
interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

const emptyConfirm: ConfirmState = { open: false, title: '', message: '', onConfirm: () => {} };

const ConfirmDialog: React.FC<{ state: ConfirmState; onClose: () => void }> = ({ state, onClose }) => (
  <AnimatePresence>
    {state.open && (
      <motion.div
        key="confirm-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', duration: 0.35 }}
          className="bg-white rounded-3xl p-6 w-full max-w-sm card-shadow space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">{state.title}</h3>
              <p className="text-sm font-medium text-slate-500">{state.message}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => { state.onConfirm(); onClose(); }}
              className="flex-1 h-11 rounded-2xl bg-red-500 text-white font-black text-sm shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors"
            >
              确定删除
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ---------- Main component ---------- */
interface WordsAdminViewProps {
  onBack: () => void;
}

export const WordsAdminView: React.FC<WordsAdminViewProps> = ({ onBack }) => {
  const [categories, setCategories] = useState<WordCategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [pairs, setPairs] = useState<WordPairDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(emptyConfirm);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirm({ open: true, title, message, onConfirm });
  }, []);

  const selectedCategory = useMemo(
    () => categories.find(c => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  const reloadCategories = async (opts?: { keepSelection?: boolean }) => {
    setError(null);
    const keep = Boolean(opts?.keepSelection);
    const prev = selectedCategoryId;
    const next = await listWordCategories();
    setCategories(next);

    if (keep && prev && next.some(c => c.id === prev)) {
      setSelectedCategoryId(prev);
      return;
    }

    setSelectedCategoryId(next[0]?.id || null);
  };

  const reloadPairs = async (categoryId: string | null) => {
    setError(null);
    if (!categoryId) {
      setPairs([]);
      return;
    }
    const next = await listWordPairs(categoryId);
    setPairs(next);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await reloadCategories();
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await reloadPairs(selectedCategoryId);
      } catch (e: any) {
        setError(String(e?.message || e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCivilianWord, setNewCivilianWord] = useState('');
  const [newUndercoverWord, setNewUndercoverWord] = useState('');

  const onCreateCategory = async () => {
    setError(null);
    const name = newCategoryName.trim();
    if (!name) return;
    setLoading(true);
    try {
      await adminCreateWordCategory(name);
      setNewCategoryName('');
      await reloadCategories({ keepSelection: true });
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const doDeleteCategory = async (categoryId: string) => {
    setError(null);
    setLoading(true);
    try {
      await adminDeleteWordCategory(categoryId);
      await reloadCategories();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const onDeleteCategory = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    showConfirm('删除分类', `确定删除「${cat?.name || ''}」分类及其所有词语吗？此操作不可撤销。`, () => doDeleteCategory(categoryId));
  };

  const onCreatePair = async () => {
    setError(null);
    if (!selectedCategoryId) return;
    const cw = newCivilianWord.trim();
    const uw = newUndercoverWord.trim();
    if (!cw || !uw) return;
    setLoading(true);
    try {
      await adminCreateWordPair({ category_id: selectedCategoryId, civilian_word: cw, undercover_word: uw });
      setNewCivilianWord('');
      setNewUndercoverWord('');
      await reloadPairs(selectedCategoryId);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const doDeletePair = async (pairId: string) => {
    setError(null);
    setLoading(true);
    try {
      await adminDeleteWordPair(pairId);
      await reloadPairs(selectedCategoryId);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const onDeletePair = (pairId: string) => {
    const pair = pairs.find(p => p.id === pairId);
    showConfirm('删除词对', `确定删除词对「${pair?.civilian_word || ''} / ${pair?.undercover_word || ''}」吗？`, () => doDeletePair(pairId));
  };

  return (
    <div className="min-h-screen bg-game-bg flex flex-col items-center px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-4xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between px-2">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">管理员</div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">词库管理</h2>
          </div>
          <button onClick={onBack} className="h-10 px-5 bg-white text-slate-500 rounded-2xl font-black card-shadow text-sm">
            返回
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm font-bold rounded-2xl px-4 py-3">
            {error}
          </div>
        )}

        {/* ——— 分类区域 ——— */}
        <div className="bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 card-shadow space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">词语分类</div>
            <div className="text-[11px] font-bold text-slate-300">{categories.length} 个分类</div>
          </div>

          {/* 新增分类 */}
          <div className="flex gap-2">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onCreateCategory()}
              placeholder="输入新分类名称，例如：成语"
              className="flex-1 min-w-0 bg-slate-50 border-none rounded-xl py-2.5 px-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCreateCategory}
              disabled={loading || !newCategoryName.trim()}
              className="h-10 px-4 bg-primary text-white rounded-xl font-black text-sm shadow-lg shadow-primary/20 disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">新增</span>
            </motion.button>
          </div>

          {/* 分类列表 — 横向滚动 */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {categories.map(c => (
              <div key={c.id} className="flex-shrink-0">
                <button
                  onClick={() => setSelectedCategoryId(c.id)}
                  className={`group flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black transition-all ${
                    selectedCategoryId === c.id
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="truncate max-w-[120px]">{c.name}</span>
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); onDeleteCategory(c.id); }}
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      selectedCategoryId === c.id
                        ? 'bg-white/20 text-white hover:bg-white/40'
                        : 'bg-slate-200 text-slate-400 hover:bg-red-100 hover:text-red-500'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </span>
                </button>
              </div>
            ))}

            {!loading && categories.length === 0 && (
              <div className="text-sm font-bold text-slate-400 py-1">暂无分类，请先新增</div>
            )}
          </div>
        </div>

        {/* ——— 词对区域 ——— */}
        <div className="bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 card-shadow space-y-4">
          {/* 词对标题 — 显示所属分类 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">词对</div>
              {selectedCategory && (
                <>
                  <div className="w-px h-4 bg-slate-200" />
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-black px-2.5 py-1 rounded-full">
                    {selectedCategory.name}
                  </span>
                </>
              )}
            </div>
            {selectedCategory && (
              <div className="text-[11px] font-bold text-slate-300">{pairs.length} 个词对</div>
            )}
          </div>

          {/* 新增词对 */}
          {selectedCategoryId ? (
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                value={newCivilianWord}
                onChange={(e) => setNewCivilianWord(e.target.value)}
                placeholder="平民词"
                className="flex-1 min-w-0 bg-slate-50 border-none rounded-xl py-2.5 px-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <input
                value={newUndercoverWord}
                onChange={(e) => setNewUndercoverWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onCreatePair()}
                placeholder="卧底词"
                className="flex-1 min-w-0 bg-slate-50 border-none rounded-xl py-2.5 px-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCreatePair}
                disabled={loading || !newCivilianWord.trim() || !newUndercoverWord.trim()}
                className="h-10 w-full sm:w-auto sm:px-5 bg-emerald-500 text-white rounded-xl font-black text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-1.5 flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                新增词对
              </motion.button>
            </div>
          ) : (
            <div className="text-center py-6 text-sm font-bold text-slate-400">
              👆 请先在上方选择一个分类
            </div>
          )}

          {/* 词对列表 */}
          {selectedCategoryId && (
            <div className="space-y-2">
              {pairs.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <span className="text-sm font-black text-slate-900 truncate">{p.civilian_word}</span>
                    <span className="text-slate-300 font-bold text-xs">/</span>
                    <span className="text-sm font-black text-primary truncate">{p.undercover_word}</span>
                  </div>
                  <button
                    onClick={() => onDeletePair(p.id)}
                    className="ml-3 h-8 w-8 rounded-lg bg-white border border-slate-100 text-red-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {!loading && pairs.length === 0 && (
                <div className="text-center py-6 text-sm font-bold text-slate-400">该分类暂无词对</div>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center text-sm font-bold text-slate-400 py-2">加载中…</div>
        )}
      </div>

      <ConfirmDialog state={confirm} onClose={() => setConfirm(emptyConfirm)} />
    </div>
  );
};
