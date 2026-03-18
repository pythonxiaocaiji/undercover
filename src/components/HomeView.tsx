import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Plus, Users, Clock, Tag, ChevronLeft, Sparkles } from 'lucide-react';
import { RoomConfig } from '../types';
import { cn } from '../lib/utils';

interface HomeViewProps {
  onStartGame: (config: RoomConfig) => Promise<void>;
  onMatch: (roomId: string) => Promise<void>;
  meName: string;
  meAvatar: string;
  activeRoomId?: string | null;
  onResumeRoom?: () => void;
  onProfile: () => void;
  onLogout: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onStartGame, onMatch, meName, meAvatar, activeRoomId, onResumeRoom, onProfile, onLogout }) => {
  const [view, setView] = useState<'main' | 'create' | 'join'>('main');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [config, setConfig] = useState<RoomConfig>({
    playerCount: 8,
    speakingTime: 30,
    votingTime: 30,
    wordCategory: '美食',
    undercoverCount: 2,
  });

  const categories = ['美食', '动物', '科技', '电影', '随机'];
  const times = [30, 60, 90];

  const handleJoinRoom = async () => {
    if (joinRoomId.length !== 6) return;
    try {
      await onMatch(joinRoomId);
    } catch (e: any) {
      window.alert(String(e?.message || e));
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
    <div className="min-h-screen bg-game-bg flex flex-col items-center justify-center px-6 py-12">
      <AnimatePresence mode="wait">
        {view === 'main' ? (
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-12 text-center"
          >
            <div className="flex items-center justify-between bg-white rounded-[32px] p-4 card-shadow border border-slate-50">
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
              <button onClick={onLogout} className="text-xs font-black text-red-500 hover:text-red-600">
                退出
              </button>
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
                    window.alert(`你已在房间 ${activeRoomId} 中，请先返回该房间或退出后再创建新房间`);
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
                    window.alert(`你已在房间 ${activeRoomId} 中，请先返回该房间或退出后再加入新房间`);
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

            <div className="bg-white rounded-[40px] p-8 space-y-8 card-shadow">
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
                  {categories.map(c => (
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
                <input 
                  type="text"
                  placeholder="或者输入自定义词语/任务..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-accent/50"
                  onChange={(e) => setConfig({...config, wordCategory: e.target.value})}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  try {
                    await onStartGame(config);
                  } catch (e: any) {
                    window.alert(String(e?.message || e));
                  }
                }}
                className="w-full h-16 bg-primary text-white rounded-3xl font-black text-lg shadow-xl shadow-primary/20"
              >
                开始游戏
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
