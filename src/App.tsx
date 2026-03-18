import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TopBar } from './components/TopBar';
import { SpeakerFocus } from './components/SpeakerFocus';
import { PlayerCard } from './components/PlayerCard';
import { ActionBar } from './components/ActionBar';
import { VotingModal } from './components/VotingModal';
import { HomeView } from './components/HomeView';
import { ConfirmModal } from './components/ConfirmModal';
import { AuthView } from './components/AuthView';
import { ProfileView } from './components/ProfileView';
import { Player, GameState, RoomConfig, PlayerRole } from './types';
import {
  BackendRoomState,
  connectRoomWs,
  createRoom,
  joinRoom,
  wsSendReaction,
  wsSendReady,
  wsSendStart,
  wsSendStateUpdate,
  wsSendVote,
} from './services/backend';
import { clearToken, getToken, me as fetchMe } from './services/auth';
import type { UserProfile } from './services/auth';

const MOCK_PLAYERS: Player[] = [
  { id: '1', name: '阿强', avatar: 'https://picsum.photos/seed/alex/200', status: 'active' },
  { id: '2', name: '小明', avatar: 'https://picsum.photos/seed/jordan/200', status: 'active' },
  { id: '3', name: '凯西', avatar: 'https://picsum.photos/seed/casey/200', status: 'active' },
  { id: '4', name: '瑞利', avatar: 'https://picsum.photos/seed/riley/200', status: 'active' },
  { id: '5', name: '泰勒', avatar: 'https://picsum.photos/seed/taylor/200', status: 'active' },
  { id: '6', name: '摩根', avatar: 'https://picsum.photos/seed/morgan/200', status: 'active' },
  { id: '7', name: '斯凯', avatar: 'https://picsum.photos/seed/skyler/200', status: 'active' },
  { id: '8', name: '奎恩', avatar: 'https://picsum.photos/seed/quinn/200', status: 'active' },
  { id: '9', name: '小红', avatar: 'https://picsum.photos/seed/red/200', status: 'active' },
  { id: '10', name: '小刚', avatar: 'https://picsum.photos/seed/strong/200', status: 'active' },
];

const WORD_PAIRS: Record<string, [string, string][]>= {
  '美食': [
    ['包子', '饺子'],
    ['汉堡', '三明治'],
    ['火锅', '冒菜'],
    ['牛奶', '豆浆'],
  ],
  '动物': [
    ['老虎', '狮子'],
    ['猫', '狗'],
    ['企鹅', '鸭子'],
    ['狼', '狐狸'],
  ],
  '科技': [
    ['手机', '平板'],
    ['电脑', '笔记本'],
    ['微信', '支付宝'],
    ['耳机', '音箱'],
  ],
  '电影': [
    ['泰坦尼克号', '阿凡达'],
    ['西游记', '封神榜'],
    ['哈利波特', '指环王'],
  ],
  '随机': [
    ['雨伞', '雨衣'],
    ['牙刷', '牙膏'],
    ['镜子', '玻璃'],
  ]
};

const INITIAL_GAME_STATE: GameState = {
  roomId: '',
  roomName: '秘密花园 #42',
  playerCount: 0,
  maxPlayers: 10,
  phase: '大厅',
  timer: 30,
  currentSpeakerId: null,
  round: 1,
};

type ActiveRoom = { roomId: string; playerId: string };
const ACTIVE_ROOM_KEY = 'undercover_active_room';

function loadActiveRoom(): ActiveRoom | null {
  try {
    const raw = localStorage.getItem(ACTIVE_ROOM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveRoom;
    if (!parsed?.roomId || !parsed?.playerId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveActiveRoom(room: ActiveRoom) {
  localStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify(room));
}

function clearActiveRoom() {
  localStorage.removeItem(ACTIVE_ROOM_KEY);
}

export default function App() {
  const [view, setView] = useState<'home' | 'game' | 'profile' | 'auth'>('auth');
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [isVotingModalOpen, setIsVotingModalOpen] = useState(false);
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [showWord, setShowWord] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [eliminatedPlayer, setEliminatedPlayer] = useState<Player | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState<{ show: boolean; targetId: string | null }>({ show: false, targetId: null });
  const [mySecret, setMySecret] = useState<{ role: PlayerRole; word: string } | null>(null);
  const [roomPlayerId, setRoomPlayerId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(() => loadActiveRoom());

  const wsRef = useRef<WebSocket | null>(null);
  const myPlayerRef = useRef<Player | null>(null);

  const [authMe, setAuthMe] = useState<UserProfile | null>(null);

  const EMOJIS = ['👍', '👎', '😂', '😮', '😢', '😡', '🔥', '❤️', '🤔', '👀'];

  const myPlayer: Player = useMemo(() => {
    if (authMe) {
      const created: Player = {
        id: authMe.id,
        name: authMe.username,
        avatar: authMe.avatar,
        status: 'active',
        isReady: false,
        isHost: false,
      };
      myPlayerRef.current = created;
      return created;
    }
    if (myPlayerRef.current) return myPlayerRef.current;
    const cached = localStorage.getItem('undercover_me');
    if (cached) {
      myPlayerRef.current = JSON.parse(cached);
      return myPlayerRef.current;
    }

    const pick = MOCK_PLAYERS[Math.floor(Math.random() * MOCK_PLAYERS.length)];
    const created: Player = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: pick.name,
      avatar: pick.avatar,
      status: 'active',
      isReady: false,
      isHost: false,
    };
    localStorage.setItem('undercover_me', JSON.stringify(created));
    myPlayerRef.current = created;
    return created;
  }, [authMe]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setView('auth');
      return;
    }
    fetchMe()
      .then((u) => {
        setAuthMe(u);
        const ar = loadActiveRoom();
        setActiveRoom(ar);
        if (ar) {
          setRoomPlayerId(ar.playerId);
          connectWs(ar.roomId, ar.playerId);
          setView('game');
        } else {
          setView('home');
        }
      })
      .catch(() => {
        clearToken();
        setView('auth');
      });
  }, []);

  const isHost = useMemo(() => {
    const pid = roomPlayerId || myPlayer.id;
    return Boolean(players.find(p => p.id === pid)?.isHost);
  }, [players, myPlayer, roomPlayerId]);

  const sendReaction = (targetId: string, emoji: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      wsSendReaction(ws, roomPlayerId || myPlayer.id, targetId, emoji);
    }
    setShowEmojiPicker({ show: false, targetId: null });
  };

  const handleExit = () => {
    setIsExitConfirmOpen(true);
  };

  const confirmExit = () => {
    setIsExitConfirmOpen(false);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    clearActiveRoom();
    setActiveRoom(null);
    setRoomPlayerId(null);
    setPlayers([]);
    setGameState(INITIAL_GAME_STATE);
    setRoomConfig(null);
    setReactions({});
    setMySecret(null);
    setView('home');
  };

  const applyBackendState = (state: BackendRoomState) => {
    const currentSpeakerIndex = (state.players || []).findIndex(p => p.id === state.currentSpeakerId);
    const mappedPlayers: Player[] = (state.players || []).map((p, idx) => {
      const base: Player = {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        status: p.status,
        isHost: p.isHost,
        isReady: p.isReady,
        votes: p.votes,
        role: p.role,
        isSpeaking: Boolean(state.currentSpeakerId && p.id === state.currentSpeakerId),
        hasSpoken: state.phase === '发言' && currentSpeakerIndex >= 0 ? idx < currentSpeakerIndex : undefined,
      };

      if (roomPlayerId && p.id === roomPlayerId && mySecret) {
        base.role = mySecret.role;
        base.word = mySecret.word;
      }

      return base;
    });
    setPlayers(mappedPlayers);
    setReactions(state.reactions || {});

    setRoomConfig({
      playerCount: mappedPlayers.length,
      speakingTime: state.speakingTime,
      votingTime: state.votingTime,
      wordCategory: state.wordCategory,
      undercoverCount: state.undercoverCount,
    });

    setGameState(prev => ({
      ...prev,
      roomId: state.roomId,
      roomName: state.roomName,
      playerCount: mappedPlayers.length,
      maxPlayers: state.maxPlayers,
      phase: state.phase,
      timer: state.timer,
      currentSpeakerId: state.currentSpeakerId,
      round: state.round,
      winner: state.winner,
    }));
  };

  const connectWs = (roomId: string, playerId: string) => {
    if (wsRef.current) wsRef.current.close();
    const ws = connectRoomWs(roomId, playerId);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type === 'state') {
        applyBackendState(msg.payload as BackendRoomState);
      }
      if (msg.type === 'secret') {
        const payload = msg.payload as { playerId: string; role: PlayerRole; word: string };
        if (payload.playerId === playerId) {
          setMySecret({ role: payload.role, word: payload.word });
        }
      }
      if (msg.type === 'reaction') {
        const payload = msg.payload as { targetPlayerId: string; emoji: string };
        setReactions(prev => ({ ...prev, [payload.targetPlayerId]: payload.emoji }));
        setTimeout(() => {
          setReactions(prev => {
            const next = { ...prev };
            delete next[payload.targetPlayerId];
            return next;
          });
        }, 3000);
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
    };
  };

  useEffect(() => {
    if (view !== 'game') return;
    if (!isHost) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (gameState.phase !== '发言' && gameState.phase !== '投票') return;
    if (!roomConfig) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        let next: GameState = prev;

        if (prev.timer > 0) {
          next = { ...prev, timer: prev.timer - 1 };
        } else {
          if (prev.phase === '发言') {
            const activePlayers = players.filter(p => p.status === 'active');
            const currentIndex = activePlayers.findIndex(p => p.id === prev.currentSpeakerId);

            if (currentIndex >= 0 && currentIndex < activePlayers.length - 1) {
              next = {
                ...prev,
                currentSpeakerId: activePlayers[currentIndex + 1].id,
                timer: roomConfig.speakingTime,
              };
            } else {
              next = {
                ...prev,
                phase: '投票',
                currentSpeakerId: null,
                timer: roomConfig.votingTime,
              };
            }
          } else {
            next = prev;
          }
        }

        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          const backendState: BackendRoomState = {
            roomId: prev.roomId,
            roomName: prev.roomName,
            maxPlayers: prev.maxPlayers,
            phase: next.phase,
            timer: next.timer,
            speakingTime: roomConfig.speakingTime,
            votingTime: roomConfig.votingTime,
            wordCategory: roomConfig.wordCategory,
            undercoverCount: roomConfig.undercoverCount,
            round: prev.round,
            currentSpeakerId: next.currentSpeakerId,
            players: players.map(p => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar,
              status: p.status,
              isHost: p.isHost,
              isReady: p.isReady,
              votes: p.votes,
            })),
            reactions,
          };
          wsSendStateUpdate(ws, backendState);
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [view, isHost, gameState.phase, gameState.roomId, roomConfig, players, reactions]);

  const handleStartGame = async (config: RoomConfig) => {
    const existing = activeRoom || loadActiveRoom();
    if (existing) {
      window.alert(`你已在房间 ${existing.roomId} 中，请先返回该房间或退出后再创建新房间`);
      return;
    }
    const resp = await createRoom({
      roomName: '秘密花园 #42',
      maxPlayers: config.playerCount,
      config,
      host: { id: myPlayer.id, name: myPlayer.name, avatar: myPlayer.avatar },
    });
    setRoomPlayerId(resp.playerId);
    const ar: ActiveRoom = { roomId: resp.roomId, playerId: resp.playerId };
    setActiveRoom(ar);
    saveActiveRoom(ar);
    connectWs(resp.roomId, resp.playerId);
    setView('game');
  };

  const handleJoinRoom = async (roomId: string) => {
    const existing = activeRoom || loadActiveRoom();
    if (existing) {
      window.alert(`你已在房间 ${existing.roomId} 中，请先返回该房间或退出后再加入新房间`);
      return;
    }
    const resp = await joinRoom({ roomId, player: { id: myPlayer.id, name: myPlayer.name, avatar: myPlayer.avatar } });
    setRoomPlayerId(resp.playerId);
    const ar: ActiveRoom = { roomId, playerId: resp.playerId };
    setActiveRoom(ar);
    saveActiveRoom(ar);
    connectWs(roomId, resp.playerId);
    setView('game');
  };

  const handleResumeRoom = () => {
    const ar = activeRoom || loadActiveRoom();
    if (!ar) return;
    setActiveRoom(ar);
    setRoomPlayerId(ar.playerId);
    connectWs(ar.roomId, ar.playerId);
    setView('game');
  };

  const handleVote = (playerId: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      wsSendVote(ws, roomPlayerId || myPlayer.id, playerId);
    }
  };

  const currentSpeaker = players.find(p => p.id === gameState.currentSpeakerId) || null;

  if (view === 'home') {
    return (
      <HomeView 
        onStartGame={handleStartGame} 
        onMatch={handleJoinRoom}
        meName={authMe?.username || myPlayer.name}
        meAvatar={authMe?.avatar || myPlayer.avatar}
        activeRoomId={activeRoom?.roomId || null}
        onResumeRoom={handleResumeRoom}
        onProfile={() => setView('profile')}
        onLogout={() => {
          clearToken();
          setAuthMe(null);
          setRoomPlayerId(null);
          clearActiveRoom();
          setActiveRoom(null);
          myPlayerRef.current = null;
          setView('auth');
        }}
      />
    );
  }

  if (view === 'auth') {
    return (
      <AuthView
        onLoginSuccess={async () => {
          const u = await fetchMe();
          setAuthMe(u);
          setView('home');
        }}
        onRegisterSuccess={async () => {
          const u = await fetchMe();
          setAuthMe(u);
          setView('home');
        }}
      />
    );
  }

  if (view === 'profile') {
    if (!authMe) {
      setView('auth');
      return null;
    }
    return (
      <ProfileView
        me={authMe}
        onUpdated={(next) => {
          setAuthMe(next);
          myPlayerRef.current = null;
        }}
        onBack={() => setView('home')}
        onLogout={() => {
          clearToken();
          setAuthMe(null);
          setRoomPlayerId(null);
          clearActiveRoom();
          setActiveRoom(null);
          myPlayerRef.current = null;
          setView('auth');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-game-bg pb-32">
      <TopBar 
        roomName={gameState.roomName}
        roomId={gameState.roomId}
        playerCount={gameState.playerCount}
        maxPlayers={gameState.maxPlayers}
        phase={gameState.phase}
        timer={gameState.timer}
        onExit={handleExit}
      />

      <main className="max-w-2xl mx-auto px-6">
        <AnimatePresence mode="wait">
          {gameState.phase === '大厅' ? (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-12 space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-black text-slate-900">等待玩家准备...</h2>
                <div className="flex items-center justify-center gap-2 px-6 py-3 bg-white rounded-2xl card-shadow">
                  <span className="text-slate-400 font-bold text-sm">房间号:</span>
                  <span className="text-primary font-black text-xl tracking-wider">{gameState.roomId}</span>
                </div>
                <p className="text-slate-400 font-medium">
                  已准备: {players.filter(p => p.isReady).length} / {players.length}
                </p>
              </div>
            </motion.div>
          ) : gameState.phase === '结果' && eliminatedPlayer ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-20 space-y-6"
            >
              <div className="w-32 h-32 rounded-full overflow-hidden border-8 border-primary shadow-2xl">
                <img src={eliminatedPlayer.avatar} alt="" className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-slate-900">{eliminatedPlayer.name} 出局</h2>
                <p className="text-xl font-bold text-primary">身份：{eliminatedPlayer.role}</p>
              </div>
            </motion.div>
          ) : gameState.phase === '结束' ? (
            <motion.div
              key="end"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-14 space-y-8"
            >
              {(() => {
                const myId = roomPlayerId || myPlayer.id;
                const me = players.find(p => p.id === myId) || null;
                const myRole = me?.role || mySecret?.role || null;
                const winner = gameState.winner || '平民';
                const didWin = (winner === '平民' && myRole === '平民') || (winner === '卧底' && myRole === '卧底');
                const winners = players.filter(p => p.role === winner);
                const losers = players.filter(p => p.role && p.role !== winner);

                return (
                  <div className="w-full max-w-md space-y-6">
                    <div
                      className={
                        `rounded-[40px] p-8 card-shadow border ${didWin ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`
                      }
                    >
                      <div className="text-center space-y-2">
                        <div
                          className={
                            `text-[12px] font-black tracking-widest uppercase ${didWin ? 'text-emerald-600' : 'text-red-600'}`
                          }
                        >
                          {didWin ? 'Victory' : 'Defeat'}
                        </div>
                        <h2 className="text-4xl font-black text-slate-900">{winner} 获胜</h2>
                        <div className="text-sm font-bold text-slate-500">你的身份：{myRole || '未知'}</div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-3xl p-4 border border-white/60">
                          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">胜方</div>
                          <div className="mt-2 text-sm font-black text-slate-900">{winner}</div>
                          <div className="mt-1 text-xs font-bold text-slate-400">{winners.length} 人</div>
                        </div>
                        <div className="bg-white rounded-3xl p-4 border border-white/60">
                          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">败方</div>
                          <div className="mt-2 text-sm font-black text-slate-900">{winner === '平民' ? '卧底' : '平民'}</div>
                          <div className="mt-1 text-xs font-bold text-slate-400">{losers.length} 人</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[40px] p-6 card-shadow space-y-4">
                      <div className="text-xs font-black text-slate-400 uppercase tracking-widest">对局明细</div>

                      <div className="space-y-3">
                        <div className="text-sm font-black text-slate-900">胜方阵营</div>
                        <div className="grid grid-cols-2 gap-3">
                          {winners.map(p => (
                            <div key={p.id} className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3">
                              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white border border-slate-100">
                                <img
                                  src={p.avatar}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-black text-slate-900 truncate">{p.name}</div>
                                <div className="text-[10px] font-bold text-slate-400">{p.role}</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="text-sm font-black text-slate-900 mt-2">败方阵营</div>
                        <div className="grid grid-cols-2 gap-3">
                          {losers.map(p => (
                            <div key={p.id} className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3">
                              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white border border-slate-100">
                                <img
                                  src={p.avatar}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-black text-slate-900 truncate">{p.name}</div>
                                <div className="text-[10px] font-bold text-slate-400">{p.role}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={confirmExit}
                      className="w-full h-14 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/20"
                    >
                      返回首页
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          ) : (
            <motion.div
              key={gameState.currentSpeakerId || 'none'}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            >
              <SpeakerFocus 
                player={currentSpeaker} 
                timer={gameState.timer} 
                maxTimer={gameState.phase === '投票' ? (roomConfig?.votingTime || 30) : (roomConfig?.speakingTime || 30)} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {gameState.phase !== '结束' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                玩家列表
              </h3>
              <div className="h-px flex-1 bg-slate-100 ml-4" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {players.map((player) => (
                <PlayerCard 
                  key={player.id} 
                  player={player} 
                  isMe={player.id === (roomPlayerId || myPlayer.id)}
                  reaction={reactions[player.id]}
                  onClick={() => {
                    if (gameState.phase !== '结束') {
                      setShowEmojiPicker({ show: true, targetId: player.id });
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {gameState.phase !== '结束' && (
        <ActionBar 
          onVoteClick={() => setIsVotingModalOpen(true)}
          onChatClick={() => setShowWord(!showWord)}
          onEmojiClick={() => setShowEmojiPicker({ show: true, targetId: roomPlayerId || myPlayer.id })}
          onReadyClick={() => {
            const ws = wsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
              const pid = roomPlayerId || myPlayer.id;
              const me = players.find(p => p.id === pid);
              wsSendReady(ws, pid, !me?.isReady);
            }
          }}
          onStartClick={() => {
            const ws = wsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
              wsSendStart(ws, roomPlayerId || myPlayer.id);
            }
          }}
          canVote={gameState.phase === '投票'}
          isLobby={gameState.phase === '大厅'}
          isReady={Boolean(players.find(p => p.id === (roomPlayerId || myPlayer.id))?.isReady)}
          isHost={isHost}
          canStart={players.every(p => p.isReady) && players.length >= 3}
        />
      )}

      {/* Emoji Picker Overlay */}
      <AnimatePresence>
        {showEmojiPicker.show && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmojiPicker({ show: false, targetId: null })}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 bg-white p-4 rounded-[32px] shadow-2xl border border-slate-100 w-[90%] max-w-sm"
            >
              <div className="text-center mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  发送表情给 {players.find(p => p.id === showEmojiPicker.targetId)?.name}
                </p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {EMOJIS.map(emoji => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => showEmojiPicker.targetId && sendReaction(showEmojiPicker.targetId, emoji)}
                    className="text-3xl p-2 hover:bg-slate-50 rounded-2xl transition-colors"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Word Reveal Overlay */}
      <AnimatePresence>
        {showWord && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 bg-white px-8 py-4 rounded-2xl shadow-2xl border-2 border-primary flex flex-col items-center"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">你的词语</span>
            <span className="text-2xl font-black text-primary">{mySecret?.word || ''}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <VotingModal 
        isOpen={isVotingModalOpen}
        onClose={() => setIsVotingModalOpen(false)}
        players={players}
        onVote={handleVote}
        myPlayerId={roomPlayerId || myPlayer.id}
      />
      <ConfirmModal 
        isOpen={isExitConfirmOpen}
        title="退出房间"
        message="确定要退出当前房间吗？您的游戏进度将会丢失。"
        confirmText="确定退出"
        cancelText="继续游戏"
        onConfirm={confirmExit}
        onCancel={() => setIsExitConfirmOpen(false)}
      />
    </div>
  );
}
