import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, UserPlus, X, Trash2 } from 'lucide-react';
import type { FriendItem } from '../types';
import { listFriends, removeFriend, sendFriendRequest } from '../services/backend';
import { useToast } from './Toast';

interface UserListViewProps {
  onBack: () => void;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  online:  { label: '在线',   color: 'bg-emerald-400' },
  busy:    { label: '忙碌中', color: 'bg-amber-400'   },
  in_game: { label: '游戏中', color: 'bg-red-400'     },
  in_room: { label: '在房间', color: 'bg-blue-400'    },
  offline: { label: '离线',   color: 'bg-slate-300'   },
};

export const UserListView: React.FC<UserListViewProps> = ({ onBack }) => {
  const { toast } = useToast();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(false);

  // popover: fixed position relative to viewport
  const [popover, setPopover] = useState<{ userId: string; x: number; y: number } | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addPhone, setAddPhone] = useState('');
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setFriends(await listFriends());
    } catch (e: any) {
      toast('error', '加载失败', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load().catch(() => {}); }, []);

  const handleAvatarClick = (userId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (popover?.userId === userId) {
      setPopover(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({ userId, x: rect.left, y: rect.bottom + 6 });
  };

  const openAddDialog = () => {
    setPopover(null);
    setAddPhone('');
    setAddDialogOpen(true);
  };

  const handleSend = async () => {
    const phone = addPhone.trim();
    if (!phone) return;
    setSending(true);
    try {
      await sendFriendRequest(phone);
      toast('success', '已发送', '好友申请已发送');
      setAddDialogOpen(false);
      setAddPhone('');
    } catch (e: any) {
      toast('error', '发送失败', String(e?.message || e));
    } finally {
      setSending(false);
    }
  };

  const activeFriend = friends.find((f) => f.user_id === popover?.userId) || null;

  return (
    <div className="min-h-screen bg-game-bg px-4 py-6 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900">好友列表</h1>
              <p className="text-sm font-medium text-slate-400">点击头像添加/删除好友</p>
            </div>
          </div>
          <button onClick={() => load()} className="text-xs font-black text-primary">刷新</button>
        </div>

        {/* Friend List */}
        <div className="bg-white rounded-[32px] p-5 card-shadow">
          {loading && (
            <div className="text-center py-10 text-sm font-bold text-slate-300">加载中…</div>
          )}
          {!loading && friends.length === 0 && (
            <div className="text-center py-10 space-y-3">
              <div className="text-sm font-bold text-slate-300">还没有好友</div>
              <button
                onClick={openAddDialog}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-2xl text-xs font-black shadow-lg shadow-primary/20"
              >
                <UserPlus className="w-3.5 h-3.5" />
                添加好友
              </button>
            </div>
          )}
          {friends.map((friend) => {
            const rawStatus = friend.user_status || 'online';
            const statusInfo = STATUS_LABEL[rawStatus] || STATUS_LABEL['online'];
            return (
              <div
                key={friend.user_id}
                className="flex items-center gap-3 py-3 px-1 border-b border-slate-50 last:border-0"
              >
                {/* Avatar button */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={(e) => handleAvatarClick(friend.user_id, e)}
                    className="relative focus:outline-none"
                  >
                    <img
                      src={friend.avatar}
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover hover:brightness-90 transition-all"
                      referrerPolicy="no-referrer"
                    />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusInfo.color}`} />
                  </button>
                </div>
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900 truncate">{friend.username}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusInfo.color}`} />
                    <span className="text-xs font-bold text-slate-400">{statusInfo.label}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {!loading && friends.length > 0 && (
            <div className="pt-4 mt-2 border-t border-slate-50">
              <button
                onClick={openAddDialog}
                className="flex items-center gap-2 text-sm font-black text-primary hover:brightness-110"
              >
                <UserPlus className="w-4 h-4" />
                添加新好友
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fixed-position avatar popover */}
      <AnimatePresence>
        {popover && activeFriend && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setPopover(null)}
            />
            <motion.div
              key="avatar-popover"
              initial={{ opacity: 0, scale: 0.88, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: -4 }}
              transition={{ duration: 0.13 }}
              style={{ position: 'fixed', top: popover.y, left: popover.x, zIndex: 40 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-1.5 min-w-[140px]"
            >
              <button
                onClick={openAddDialog}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-black text-slate-700"
              >
                <UserPlus className="w-4 h-4 text-primary" />
                添加用户
              </button>
              <button
                onClick={async () => {
                  const uid = activeFriend.user_id;
                  setPopover(null);
                  try {
                    await removeFriend(uid);
                    await load();
                  } catch (e: any) {
                    toast('error', '删除失败', String(e?.message || e));
                  }
                }}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl hover:bg-red-50 text-sm font-black text-red-500"
              >
                <Trash2 className="w-4 h-4" />
                删除好友
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Friend Dialog */}
      <AnimatePresence>
        {addDialogOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => { setAddDialogOpen(false); setAddPhone(''); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-80 bg-white rounded-[28px] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  <span className="text-base font-black text-slate-900">添加用户</span>
                </div>
                <button
                  onClick={() => { setAddDialogOpen(false); setAddPhone(''); }}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs font-bold text-slate-400 mb-3">输入对方手机号发送好友申请</p>
              <input
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value.trim())}
                placeholder="输入手机号"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              />
              <button
                onClick={handleSend}
                disabled={!addPhone.trim() || sending}
                className="w-full h-11 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {sending ? '发送中…' : '发送申请'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
