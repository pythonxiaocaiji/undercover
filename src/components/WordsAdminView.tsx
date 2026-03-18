import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2 } from 'lucide-react';
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

interface WordsAdminViewProps {
  onBack: () => void;
}

export const WordsAdminView: React.FC<WordsAdminViewProps> = ({ onBack }) => {
  const [categories, setCategories] = useState<WordCategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [pairs, setPairs] = useState<WordPairDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const onDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('确定删除该分类及其所有词语吗？')) return;
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

  const onDeletePair = async (pairId: string) => {
    if (!window.confirm('确定删除该词对吗？')) return;
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

  return (
    <div className="min-h-screen bg-game-bg flex flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl bg-white rounded-[32px] sm:rounded-[40px] p-5 sm:p-8 card-shadow space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">管理员</div>
            <h2 className="text-3xl font-black text-slate-900">词库管理</h2>
          </div>
          <button onClick={onBack} className="h-12 px-6 bg-slate-100 text-slate-500 rounded-2xl font-black">
            返回
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm font-bold rounded-2xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          <div className="space-y-4">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">分类</div>

            <div className="flex gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="新增分类，例如：成语"
                className="flex-1 bg-slate-50 border-none rounded-2xl py-3 px-4 font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCreateCategory}
                disabled={loading}
                className="h-12 w-12 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="space-y-2">
              {categories.map(c => (
                <div
                  key={c.id}
                  className={
                    `flex items-center justify-between rounded-2xl px-4 py-3 border ${selectedCategoryId === c.id ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-slate-100'}`
                  }
                >
                  <button
                    onClick={() => setSelectedCategoryId(c.id)}
                    className="min-w-0 text-left flex-1"
                  >
                    <div className="text-slate-900 font-black truncate">{c.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 truncate">{c.id}</div>
                  </button>
                  <button
                    onClick={() => onDeleteCategory(c.id)}
                    className="ml-3 h-9 w-9 rounded-xl bg-white border border-slate-100 text-red-500 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {!loading && categories.length === 0 && (
                <div className="text-sm font-bold text-slate-400">暂无分类</div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">词对</div>
                <div className="text-sm font-black text-slate-900">
                  当前分类：{selectedCategory?.name || '未选择'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={newCivilianWord}
                onChange={(e) => setNewCivilianWord(e.target.value)}
                placeholder="平民词"
                className="bg-slate-50 border-none rounded-2xl py-3 px-4 font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <input
                value={newUndercoverWord}
                onChange={(e) => setNewUndercoverWord(e.target.value)}
                placeholder="卧底词"
                className="bg-slate-50 border-none rounded-2xl py-3 px-4 font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCreatePair}
                disabled={loading || !selectedCategoryId}
                className="h-12 w-full bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                新增词对
              </motion.button>
            </div>

            <div className="space-y-2">
              {pairs.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-900 font-black truncate">{p.civilian_word} / {p.undercover_word}</div>
                    <div className="text-[10px] font-bold text-slate-400 break-all sm:truncate">{p.id}</div>
                  </div>
                  <button
                    onClick={() => onDeletePair(p.id)}
                    className="ml-3 h-9 w-9 rounded-xl bg-white border border-slate-100 text-red-500 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {!loading && selectedCategoryId && pairs.length === 0 && (
                <div className="text-sm font-bold text-slate-400">该分类暂无词对</div>
              )}

              {!selectedCategoryId && (
                <div className="text-sm font-bold text-slate-400">请先选择一个分类</div>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-sm font-bold text-slate-400">加载中…</div>
        )}
      </div>
    </div>
  );
};
