import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Users, Bell } from 'lucide-react';
import type { FriendItem, RoomInviteItem } from '../types';
import {
  acceptFriendRequest,
  clearRoomInvites,
  listFriendRequests,
  listFriends,
  listRoomInvites,
  rejectFriendRequest,
  removeFriend,
} from '../services/backend';
import { useToast } from './Toast';

interface MessagesViewProps {
  onBack: () => void;
  onJoinInvite: (roomId: string) => Promise<void>;
}

export const MessagesView: React.FC<MessagesViewProps> = ({ onBack, onJoinInvite }) => {
  const { toast } = useToast();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [requests, setRequests] = useState<FriendItem[]>([]);
  const [invites, setInvites] = useState<RoomInviteItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [nextFriends, nextRequests, nextInvites] = await Promise.all([
        listFriends(),
        listFriendRequests(),
        listRoomInvites(),
      ]);
      setFriends(nextFriends);
      setRequests(nextRequests);
      setInvites(nextInvites);
    } catch (e: any) {
      toast('error', '加载失败', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-game-bg px-4 py-6 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">消息中心</h1>
            <p className="text-sm font-medium text-slate-400">好友申请、房间邀请、好友管理</p>
          </div>
        </div>

        {/* Friend Requests */}
        <div className="bg-white rounded-[32px] p-5 card-shadow space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
              <Bell className="w-4 h-4" />
              <span>好友申请</span>
            </div>
            <button onClick={() => refresh()} className="text-xs font-black text-primary">刷新</button>
          </div>
          <div className="space-y-3">
            {requests.length === 0 && <div className="text-sm font-medium text-slate-400">暂无好友申请</div>}
            {requests.map((item) => (
              <div key={item.request_id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
                <img src={item.avatar} alt="" className="w-12 h-12 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900 truncate">{item.username}</div>
                  <div className="text-xs font-bold text-slate-400">{item.phone}</div>
                </div>
                {item.is_incoming ? (
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await acceptFriendRequest(item.request_id);
                          await refresh();
                        } catch (e: any) {
                          toast('error', '处理失败', String(e?.message || e));
                        }
                      }}
                      className="px-3 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black"
                    >
                      同意
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await rejectFriendRequest(item.request_id);
                          await refresh();
                        } catch (e: any) {
                          toast('error', '处理失败', String(e?.message || e));
                        }
                      }}
                      className="px-3 py-2 bg-slate-200 text-slate-600 rounded-xl text-xs font-black"
                    >
                      拒绝
                    </button>
                  </div>
                ) : (
                  <div className="text-xs font-black text-amber-500">等待对方处理</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Room Invites */}
        <div className="bg-white rounded-[32px] p-5 card-shadow space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
              <span>房间邀请</span>
            </div>
            <button
              onClick={async () => {
                await clearRoomInvites();
                await refresh();
              }}
              className="text-xs font-black text-slate-400 hover:text-slate-600"
            >
              清空
            </button>
          </div>
          <div className="space-y-3">
            {invites.length === 0 && <div className="text-sm font-medium text-slate-400">暂无房间邀请</div>}
            {invites.map((item, index) => (
              <motion.div key={`${item.room_id}-${index}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-slate-50 space-y-3">
                <div>
                  <div className="text-sm font-black text-slate-900">{item.inviter_name} 邀请你加入房间</div>
                  <div className="text-xs font-bold text-slate-400 mt-1">房间：{item.room_name} ({item.room_id})</div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await onJoinInvite(item.room_id);
                    } catch (e: any) {
                      toast('error', '加入失败', String(e?.message || e));
                    }
                  }}
                  className="w-full h-11 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20"
                >
                  加入该房间
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Friends List */}
        <div className="bg-white rounded-[32px] p-5 card-shadow space-y-4">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
            <Users className="w-4 h-4" />
            <span>我的好友</span>
          </div>
          <div className="space-y-3">
            {friends.length === 0 && <div className="text-sm font-medium text-slate-400">你还没有好友</div>}
            {friends.map((item) => (
              <div key={item.user_id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
                <img src={item.avatar} alt="" className="w-12 h-12 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900 truncate">{item.username}</div>
                  <div className="text-xs font-bold text-slate-400">{item.phone}</div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await removeFriend(item.user_id);
                      await refresh();
                    } catch (e: any) {
                      toast('error', '删除失败', String(e?.message || e));
                    }
                  }}
                  className="px-3 py-2 bg-slate-200 text-slate-600 rounded-xl text-xs font-black"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>

        {loading && <div className="text-center text-sm font-bold text-slate-400">加载中...</div>}
      </div>
    </div>
  );
};
