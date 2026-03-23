import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Plus, Users, Clock, Tag, ChevronLeft, Sparkles, HelpCircle, UserSearch } from 'lucide-react';
import { RoomConfig } from '../types';
import { cn } from '../lib/utils';
import { useToast } from './Toast';

interface HomeViewProps {
  onStartGame: (config: RoomConfig) => Promise<void>;
  onMatch: (roomId: string) => Promise<void>;
  meName: string;
  meAvatar: string;
  wordCategories: string[];
  onRefreshWordCategories?: () => Promise<void>;
  isAdmin?: boolean;
  onWordsAdmin?: () => void;
  activeRoomId?: string | null;
  onResumeRoom?: () => void;
  onFriends?: () => void;
  pendingFriendRequests?: number;
  pendingRoomInvites?: number;
  latestInviteRoomId?: string | null;
  onJoinLatestInvite?: () => void;
  userStatus?: 'online' | 'busy';
  onStatusChange?: (status: 'online' | 'busy') => void;
  onUsers?: () => void;
  onProfile: () => void;
  onLogout: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onStartGame, onMatch, meName, meAvatar, wordCategories, onRefreshWordCategories, isAdmin, onWordsAdmin, activeRoomId, onResumeRoom, onFriends, pendingFriendRequests, pendingRoomInvites, latestInviteRoomId, onJoinLatestInvite, userStatus, onStatusChange, onUsers, onProfile, onLogout }) => {
  const { toast } = useToast();
  const [view, setView] = useState<'main' | 'create' | 'join'>('main');
  const [showRules, setShowRules] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [config, setConfig] = useState<RoomConfig>({
    roomName: `${meName}创建的房间`,
    playerCount: 8,
    speakingTime: 30,
    votingTime: 30,
    wordCategory: wordCategories?.[0] || '随机',
    undercoverCount: 2,
    allowJoin: true,
    allowInvite: true,
  });
  const times = [30, 60, 90];

  useEffect(() => {
    if (!wordCategories || wordCategories.length <= 0) return;
    setConfig((prev) => {
      const current = (prev.wordCategory || '').trim();
      const isCustom = Boolean(current && !wordCategories.includes(current));
      if (isCustom) return prev;
      if (wordCategories.includes(current)) return prev;
      return { ...prev, wordCategory: wordCategories[0] };
    });
  }, [wordCategories]);

  const refreshRef = useRef(onRefreshWordCategories);
  refreshRef.current = onRefreshWordCategories;

  useEffect(() => {
    if (view !== 'create') return;
    refreshRef.current?.().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (view !== 'create') return;
    setConfig((prev) => {
      const name = (prev.roomName || '').trim();
      if (name) return prev;
      return { ...prev, roomName: `${meName}创建的房间` };
    });
  }, [view, meName]);

  const handleJoinRoom = async () => {
    if (joinRoomId.length !== 6) return;
    try {
      await onMatch(joinRoomId);
    } catch (e: any) {
      toast('error', '加入失败', String(e?.message || e));
    }
  };

  const handlePlayerCountChange = (count: number) => {
    let undercover = 1;
    if (count >= 5 && count <= 7) undercover = 2;
    else if (count >= 8) undercover = Math.floor(count / 3);
    
    setConfig({
      ...config, 
      playerCount: count,
      undercoverCount: undercover
    });
  };

  return (
    <div className="min-h-screen bg-game-bg flex flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <AnimatePresence mode="wait">
        {view === 'main' ? (
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-12 text-center"
          >
            <div className="bg-white rounded-[32px] p-4 card-shadow border border-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-sm bg-slate-50">
                    <img src={meAvatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="text-left">
                    <div className="text-slate-900 font-black leading-tight">{meName}</div>
                    <button onClick={onProfile} className="text-xs font-bold text-slate-400 hover:text-slate-600">
                      设置用户名/头像
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && onWordsAdmin && (
                    <button onClick={onWordsAdmin} className="text-xs font-black text-primary hover:brightness-110">
                      词库
                    </button>
                  )}
                  <button onClick={onLogout} className="text-xs font-black text-red-500 hover:text-red-600">
                    退出
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onStatusChange && (
                  <button
                    onClick={() => onStatusChange(userStatus === 'busy' ? 'online' : 'busy')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-colors',
                      userStatus === 'busy'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-emerald-50 text-emerald-600'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', userStatus === 'busy' ? 'bg-amber-400' : 'bg-emerald-400')} />
                    {userStatus === 'busy' ? '忙碌中' : '在线'}
                  </button>
                )}
                {onUsers && (
                  <button
                    onClick={onUsers}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <UserSearch className="w-3.5 h-3.5" />
                    好友列表
                  </button>
                )}
                {onFriends && (
                  <button
                    onClick={onFriends}
                    className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    消息中心
                    {((pendingFriendRequests || 0) + (pendingRoomInvites || 0)) > 0 && (
                      <span className="w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black">
                        {Math.min(9, (pendingFriendRequests || 0) + (pendingRoomInvites || 0))}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="w-24 h-24 bg-primary/10 rounded-[40px] flex items-center justify-center mx-auto border-4 border-white shadow-xl"
              >
                <Sparkles className="w-12 h-12 text-primary" />
              </motion.div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900">谁是卧底</h1>
              <p className="text-slate-400 font-medium">找出潜伏在我们之中的卧底</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowRules(true)}
              className="flex items-center justify-center gap-2 text-sm font-bold text-slate-400 hover:text-primary transition-colors mx-auto"
            >
              <HelpCircle className="w-4 h-4" />
              <span>游戏介绍与规则</span>
            </motion.button>

            {((pendingFriendRequests || 0) > 0 || (pendingRoomInvites || 0) > 0) && (
              <div className="space-y-3 text-left">
                {(pendingFriendRequests || 0) > 0 && onFriends && (
                  <button
                    onClick={onFriends}
                    className="w-full bg-white rounded-[28px] p-4 card-shadow border border-slate-50 text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-slate-900 font-black">你有 {(pendingFriendRequests || 0)} 条新的好友申请</div>
                        <div className="text-xs font-bold text-slate-400 mt-1">点击查看并处理好友申请</div>
                      </div>
                      <span className="min-w-7 h-7 px-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-black">
                        {pendingFriendRequests}
                      </span>
                    </div>
                  </button>
                )}

                {(pendingRoomInvites || 0) > 0 && (
                  <div className="w-full bg-white rounded-[28px] p-4 card-shadow border border-slate-50 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-slate-900 font-black">你有 {(pendingRoomInvites || 0)} 条新的房间邀请</div>
                        <div className="text-xs font-bold text-slate-400 mt-1">可以去好友页查看，或直接加入最近一条邀请</div>
                      </div>
                      <span className="min-w-7 h-7 px-2 flex items-center justify-center rounded-full bg-primary text-white text-xs font-black">
                        {pendingRoomInvites}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-3">
                      {onFriends && (
                        <button
                          onClick={onFriends}
                          className="flex-1 h-11 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm"
                        >
                          查看邀请
                        </button>
                      )}
                      {latestInviteRoomId && onJoinLatestInvite && (
                        <button
                          onClick={onJoinLatestInvite}
                          className="flex-1 h-11 bg-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/20"
                        >
                          直接加入
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeRoomId && onResumeRoom && (
              <div className="bg-white rounded-[32px] p-4 card-shadow border border-slate-50 text-left">
                <div className="text-slate-900 font-black">你已在房间 {activeRoomId}</div>
                <div className="text-xs font-bold text-slate-400 mt-1">点击返回可继续游戏</div>
                <div className="mt-3">
                  <button
                    onClick={onResumeRoom}
                    className="w-full h-12 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20"
                  >
                    返回房间
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (activeRoomId) {
                    toast('warning', '无法创建房间', `你已在房间 ${activeRoomId} 中，请先返回或退出`);
                    return;
                  }
                  setView('create');
                }}
                className="w-full h-20 bg-primary text-white rounded-3xl font-black text-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
              >
                <Plus className="w-6 h-6" />
                <span>创建房间</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (activeRoomId) {
                    toast('warning', '无法加入房间', `你已在房间 ${activeRoomId} 中，请先返回或退出`);
                    return;
                  }
                  setView('join');
                }}
                className="w-full h-20 bg-white text-slate-900 rounded-3xl font-black text-xl shadow-xl shadow-slate-200/50 flex items-center justify-center gap-3 border-2 border-slate-50"
              >
                <Users className="w-6 h-6 text-primary" />
                <span>加入房间</span>
              </motion.button>
            </div>
          </motion.div>
        ) : view === 'join' ? (
          <motion.div
            key="join"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-md bg-white rounded-[40px] p-8 card-shadow space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900">加入房间</h2>
              <p className="text-slate-400 font-medium">请输入 6 位房间号</p>
            </div>

            <div className="space-y-6">
              <input
                type="text"
                maxLength={6}
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                placeholder="例如: AB1234"
                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-center text-2xl font-black text-primary placeholder:text-slate-200 focus:ring-2 focus:ring-primary/20 transition-all"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => setView('main')}
                  className="flex-1 py-4 bg-slate-100 text-slate-400 font-black rounded-3xl hover:bg-slate-200 transition-all"
                >
                  返回
                </button>
                <button
                  onClick={handleJoinRoom}
                  disabled={joinRoomId.length !== 6}
                  className="flex-1 py-4 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/20 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  确认加入
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md space-y-8"
          >
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('main')}
                className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-slate-900 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-black text-slate-900">房间设置</h2>
            </div>

            <div className="bg-white rounded-[32px] sm:rounded-[40px] p-5 sm:p-8 space-y-6 sm:space-y-8 card-shadow max-h-[calc(100vh-160px)] overflow-y-auto">
              {/* Room Name */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                  <span>房间名称</span>
                </div>
                <input
                  value={config.roomName}
                  onChange={(e) => setConfig({ ...config, roomName: e.target.value })}
                  placeholder={`${meName}创建的房间`}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Player Count */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                  <Users className="w-4 h-4" />
                  <span>玩家人数</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <input 
                    type="range" 
                    min="4" 
                    max="10" 
                    value={config.playerCount}
                    onChange={(e) => handlePlayerCountChange(parseInt(e.target.value))}
                    className="flex-1 accent-primary h-2 bg-slate-100 rounded-full appearance-none cursor-pointer"
                  />
                  <div className="flex flex-col items-center">
                    <span className="w-12 h-12 flex items-center justify-center bg-primary/10 text-primary font-black rounded-2xl text-lg">
                      {config.playerCount}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-1">卧底: {config.undercoverCount}</span>
                  </div>
                </div>
              </div>

              {/* Speaking Time */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                  <Clock className="w-4 h-4" />
                  <span>发言时间</span>
                </div>
                <div className="flex gap-2">
                  {times.map(t => (
                    <button
                      key={t}
                      onClick={() => setConfig({...config, speakingTime: t})}
                      className={cn(
                        "flex-1 py-3 rounded-2xl font-bold transition-all",
                        config.speakingTime === t 
                          ? "bg-blue-accent text-white shadow-lg shadow-blue-accent/20" 
                          : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                      )}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Voting Time */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                  <Clock className="w-4 h-4" />
                  <span>投票时间</span>
                </div>
                <div className="flex gap-2">
                  {times.map(t => (
                    <button
                      key={t}
                      onClick={() => setConfig({...config, votingTime: t})}
                      className={cn(
                        "flex-1 py-3 rounded-2xl font-bold transition-all",
                        config.votingTime === t 
                          ? "bg-primary text-white shadow-lg shadow-primary/20" 
                          : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                      )}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Word Category */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                  <Tag className="w-4 h-4" />
                  <span>词语类别</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {wordCategories.map(c => (
                    <button
                      key={c}
                      onClick={() => setConfig({...config, wordCategory: c})}
                      className={cn(
                        "px-4 py-2 rounded-xl font-bold text-sm transition-all",
                        config.wordCategory === c 
                          ? "bg-purple-accent text-white shadow-lg shadow-purple-accent/20" 
                          : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                  <Users className="w-4 h-4" />
                  <span>房间权限</span>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => setConfig({ ...config, allowJoin: !config.allowJoin })}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all',
                      config.allowJoin ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                    )}
                  >
                    <span>允许其他人自由加入</span>
                    <span>{config.allowJoin ? '开启' : '关闭'}</span>
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, allowInvite: !config.allowInvite })}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all',
                      config.allowInvite ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                    )}
                  >
                    <span>允许其他玩家邀请好友</span>
                    <span>{config.allowInvite ? '开启' : '关闭'}</span>
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  try {
                    await onStartGame(config);
                  } catch (e: any) {
                    toast('error', '创建失败', String(e?.message || e));
                  }
                }}
                className="w-full h-14 sm:h-16 bg-primary text-white rounded-3xl font-black text-lg shadow-xl shadow-primary/20"
              >
                开始游戏
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 游戏规则弹窗 */}
      <AnimatePresence>
        {showRules && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRules(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md max-h-[85vh] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 pb-0">
                <h2 className="text-xl font-black text-slate-900">游戏介绍与规则</h2>
                <button
                  onClick={() => setShowRules(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="space-y-2">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span className="text-lg">🎭</span> 游戏简介
                  </h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    「谁是卧底」是一款经典的社交推理游戏。每位玩家会收到一个词语，其中大多数人（平民）拿到相同的词，少数人（卧底）拿到一个相近但不同的词。玩家需要通过描述自己的词语来找出卧底，而卧底则要伪装成平民存活下来。
                  </p>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="space-y-2">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span className="text-lg">📋</span> 游戏规则
                  </h3>
                  <ul className="text-sm font-medium text-slate-500 leading-relaxed space-y-2">
                    <li className="flex items-start gap-2"><span className="text-primary font-black">1.</span>房主创建房间，其他玩家通过房间号加入</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-black">2.</span>所有玩家准备后，房主开始游戏，系统随机分配身份和词语</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-black">3.</span>每轮按顺序发言，用语言描述自己的词语（不能直接说出词语）</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-black">4.</span>发言结束后进入投票环节，投票选出你认为的卧底</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-black">5.</span>得票最多的玩家被淘汰并揭示身份</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-black">6.</span>票数相同时进入 PK 轮，最多 3 轮后随机淘汰一人</li>
                  </ul>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="space-y-2">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span className="text-lg">🏆</span> 胜负条件
                  </h3>
                  <ul className="text-sm font-medium text-slate-500 leading-relaxed space-y-2">
                    <li className="flex items-start gap-2"><span className="text-blue-500 font-black">•</span><strong className="text-slate-700">平民胜利</strong>：所有卧底被投票淘汰</li>
                    <li className="flex items-start gap-2"><span className="text-red-500 font-black">•</span><strong className="text-slate-700">卧底胜利</strong>：存活卧底人数 ≥ 存活平民人数</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-slate-50">
                <button
                  onClick={() => setShowRules(false)}
                  className="w-full h-12 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20"
                >
                  我知道了
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
