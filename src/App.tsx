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
import { WordsAdminView } from './components/WordsAdminView';
import { useToast } from './components/Toast';
import { Player, GameState, RoomConfig, PlayerRole } from './types';
import {
  BackendRoomState,
  connectRoomWs,
  createRoom,
  joinRoom,
  listWordCategories,
  wsSendReaction,
  wsSendRestart,
  wsSendReady,
  wsSendStart,
  wsSendStateUpdate,
  wsSendVote,
} from './services/backend';
import { clearToken, getToken, me as fetchMe } from './services/auth';
import type { UserProfile } from './services/auth';

function _genLocalProfile(): Pick<Player, 'id' | 'name' | 'avatar'> {
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  const seed = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id: seed,
    name: `玩家${suffix}`,
    avatar: `https://api.dicebear.com/8.x/fun-emoji/png?seed=${encodeURIComponent(seed)}`,
  };
}

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
  const { toast } = useToast();
  const [view, setView] = useState<'home' | 'game' | 'profile' | 'auth' | 'words_admin'>('auth');
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
  const [wordCategories, setWordCategories] = useState<string[]>(['随机']);

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

    const local = _genLocalProfile();
    const created: Player = {
      id: local.id,
      name: local.name,
      avatar: local.avatar,
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
        listWordCategories()
          .then((cats) => {
            const names = (cats || []).map(c => c.name).filter(Boolean);
            if (names.length > 0) setWordCategories(names);
          })
          .catch(() => {
          });
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
      roomName: state.roomName,
      playerCount: mappedPlayers.length,
      speakingTime: state.speakingTime,
      votingTime: state.votingTime,
      wordCategory: state.wordCategory,
      undercoverCount: state.undercoverCount,
    });

    if (state.eliminatedPlayerId) {
      const ep = mappedPlayers.find(p => p.id === state.eliminatedPlayerId) || null;
      setEliminatedPlayer(ep);
    } else if (state.phase !== '结果') {
      setEliminatedPlayer(null);
    }

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
        const payload = msg.payload as BackendRoomState;
        if (!payload || !payload.roomId || !payload.players || payload.players.length === 0) {
          toast('warning', '房间不存在', '房间可能已过期或服务器已重启，已返回首页');
          confirmExit();
          return;
        }
        applyBackendState(payload);
      }
      if (msg.type === 'room:closed') {
        toast('warning', '房间已解散', '房主已退出，房间已解散');
        confirmExit();
        return;
      }
      if (msg.type === 'error') {
        const err = msg.error as string;
        if (err === 'room_not_found') {
          toast('warning', '房间不存在', '房间可能已过期，已返回首页');
          confirmExit();
          return;
        }
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

    ws.onerror = () => {
      toast('error', '连接失败', '无法连接到服务器，请稍后重试');
      confirmExit();
    };

    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
    };
  };

  useEffect(() => {
    if (view !== 'game') return;
    if (!isHost) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (gameState.phase !== '发言' && gameState.phase !== '投票' && gameState.phase !== '结果') return;
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
          } else if (prev.phase === '结果') {
            if (prev.winner) {
              next = { ...prev, phase: '结束', timer: 0 };
            } else {
              const alivePlayers = players.filter(p => p.status !== 'eliminated');
              next = {
                ...prev,
                phase: '发言',
                round: prev.round + 1,
                currentSpeakerId: alivePlayers[0]?.id || null,
                timer: roomConfig.speakingTime,
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
      toast('warning', '无法创建房间', `你已在房间 ${existing.roomId} 中，请先返回或退出后再创建`);
      return;
    }
    const resp = await createRoom({
      roomName: (config.roomName || '').trim() || `${myPlayer.name}创建的房间`,
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
      toast('warning', '无法加入房间', `你已在房间 ${existing.roomId} 中，请先返回或退出后再加入`);
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

  const handleVote = (playerId: string | null) => {
    const ws = wsRef.current;
    const myId = roomPlayerId || myPlayer.id;
    const me = players.find(p => p.id === myId) || null;
    if (!me || me.status !== 'active') return;
    if (gameState.phase !== '投票') return;
    if (ws && ws.readyState === WebSocket.OPEN) {
      wsSendVote(ws, roomPlayerId || myPlayer.id, playerId);
    }
  };

  const handleSkipSpeaking = () => {
    if (gameState.phase !== '发言') return;
    const myId = roomPlayerId || myPlayer.id;
    if (gameState.currentSpeakerId !== myId) return;
    if (!roomConfig) return;

    const activePlayers = players.filter(p => p.status === 'active');
    const currentIndex = activePlayers.findIndex(p => p.id === myId);

    let next: GameState;
    if (currentIndex >= 0 && currentIndex < activePlayers.length - 1) {
      next = {
        ...gameState,
        currentSpeakerId: activePlayers[currentIndex + 1].id,
        timer: roomConfig.speakingTime,
      };
    } else {
      next = {
        ...gameState,
        phase: '投票',
        currentSpeakerId: null,
        timer: roomConfig.votingTime,
      };
    }

    setGameState(next);

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const backendState: BackendRoomState = {
        roomId: gameState.roomId,
        roomName: gameState.roomName,
        maxPlayers: gameState.maxPlayers,
        phase: next.phase,
        timer: next.timer,
        speakingTime: roomConfig.speakingTime,
        votingTime: roomConfig.votingTime,
        wordCategory: roomConfig.wordCategory,
        undercoverCount: roomConfig.undercoverCount,
        round: gameState.round,
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
  };

  const currentSpeaker = players.find(p => p.id === gameState.currentSpeakerId) || null;

  if (view === 'home') {
    return (
      <HomeView
        onStartGame={handleStartGame}
        onMatch={handleJoinRoom}
        meName={myPlayer.name}
        meAvatar={myPlayer.avatar}
        wordCategories={wordCategories}
        onRefreshWordCategories={async () => {
          const cats = await listWordCategories();
          const names = (cats || []).map(c => c.name).filter(Boolean);
          if (names.length > 0) setWordCategories(names);
        }}
        isAdmin={Boolean(authMe?.is_admin)}
        onWordsAdmin={() => {
          if (!authMe?.is_admin) {
            toast('error', '无权限', '仅管理员可访问词库管理');
            return;
          }
          setView('words_admin');
        }}
        activeRoomId={activeRoom?.roomId || null}
        onResumeRoom={() => {
          if (!activeRoom) return;
          setRoomPlayerId(activeRoom.playerId);
          connectWs(activeRoom.roomId, activeRoom.playerId);
          setView('game');
        }}
        onProfile={() => setView('profile')}
        onLogout={() => {
          clearToken();
          clearActiveRoom();
          setActiveRoom(null);
          setAuthMe(null);
          setView('auth');
        }}
      />
    );
  }

  if (view === 'auth') {
    return (
      <AuthView
        onLoginSuccess={() => {
          fetchMe()
            .then((u) => {
              setAuthMe(u);
              listWordCategories()
                .then((cats) => {
                  const names = (cats || []).map(c => c.name).filter(Boolean);
                  if (names.length > 0) setWordCategories(names);
                })
                .catch(() => {
                });
              setView('home');
            })
            .catch(() => {
              clearToken();
              setView('auth');
            });
        }}
        onRegisterSuccess={() => {
        }}
      />
    );
  }

  if (view === 'words_admin') {
    return (
      <WordsAdminView
        onBack={() => {
          listWordCategories()
            .then((cats) => {
              const names = (cats || []).map(c => c.name).filter(Boolean);
              if (names.length > 0) setWordCategories(names);
            })
            .catch(() => {
            });
          setView('home');
        }}
      />
    );
  }

  if (view === 'profile' && authMe) {
    return (
      <ProfileView
        me={authMe}
        onUpdated={(next) => {
          setAuthMe(next);
          localStorage.setItem('undercover_me', JSON.stringify({
            id: next.id,
            name: next.username,
            avatar: next.avatar,
            status: 'active',
            isReady: false,
            isHost: false,
          }));
        }}
        onBack={() => setView('home')}
        onLogout={() => {
          clearToken();
          clearActiveRoom();
          setActiveRoom(null);
          setAuthMe(null);
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
        round={gameState.round}
        onExit={handleExit}
      />

      <main className="max-w-2xl mx-auto px-6">
        <AnimatePresence mode="wait">
          {/* ——— 大厅阶段 ——— */}
          {gameState.phase === '大厅' && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-12 space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-black text-slate-900">
                  {players.length < gameState.maxPlayers ? '等待玩家进入...' : '等待玩家准备...'}
                </h2>
                <div className="flex items-center justify-center gap-2 px-6 py-3 bg-white rounded-2xl card-shadow">
                  <span className="text-slate-400 font-bold text-sm">房间号:</span>
                  <span className="text-primary font-black text-xl tracking-wider">{gameState.roomId}</span>
                </div>
                <p className="text-slate-400 font-medium">
                  已准备: {players.filter(p => p.isReady).length} / {players.length}
                </p>
              </div>
            </motion.div>
          )}

          {/* ——— 结果阶段（投票结果展示） ——— */}
          {gameState.phase === '结果' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-10 space-y-6"
            >
              <div className="text-center space-y-3">
                <div className="text-sm font-black text-slate-400 uppercase tracking-widest">投票结果</div>
                {eliminatedPlayer ? (
                  <>
                    <div className="w-20 h-20 rounded-3xl overflow-hidden border-4 border-red-200 shadow-lg mx-auto">
                      <img src={eliminatedPlayer.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">{eliminatedPlayer.name} 被淘汰</h2>
                    {eliminatedPlayer.role && (
                      <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-black ${
                        eliminatedPlayer.role === '卧底'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        身份：{eliminatedPlayer.role}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-black text-slate-900">本轮无人被淘汰</h2>
                    <p className="text-slate-400 font-medium">全员弃票或票数相同</p>
                  </>
                )}
                <p className="text-slate-400 font-bold text-sm">{gameState.timer}s 后进入下一轮</p>
              </div>
            </motion.div>
          )}

          {/* ——— 结束阶段（游戏结算） ——— */}
          {gameState.phase === '结束' && (
            <motion.div
              key="end"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-8 space-y-8"
            >
              <div className="text-center space-y-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto border-4 border-white shadow-xl ${
                    gameState.winner === '平民' ? 'bg-blue-100' : 'bg-red-100'
                  }`}
                >
                  <span className="text-4xl">{gameState.winner === '平民' ? '🎉' : '🕵️'}</span>
                </motion.div>
                <h2 className="text-3xl font-black text-slate-900">
                  {gameState.winner === '平民' ? '平民胜利！' : '卧底胜利！'}
                </h2>
                <p className="text-slate-400 font-medium">
                  {gameState.winner === '平民' ? '所有卧底已被找出' : '卧底成功潜伏到最后'}
                </p>
              </div>

              <div className="w-full space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">角色揭示</h3>
                  <div className="h-px flex-1 bg-slate-100 ml-4" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {players.map(p => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl border ${
                        p.role === '卧底'
                          ? 'bg-red-50 border-red-100'
                          : 'bg-blue-50 border-blue-100'
                      } ${p.status === 'eliminated' ? 'opacity-60' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                        <img src={p.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-slate-900 truncate">{p.name}</div>
                        <div className={`text-xs font-bold ${p.role === '卧底' ? 'text-red-500' : 'text-blue-500'}`}>
                          {p.role || '未知'}{p.status === 'eliminated' ? ' · 已淘汰' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {isHost && (
                <div className="w-full space-y-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const ws = wsRef.current;
                      if (ws && ws.readyState === WebSocket.OPEN) {
                        wsSendRestart(ws, roomPlayerId || myPlayer.id);
                      }
                    }}
                    disabled={!players.every(p => p.isReady)}
                    className="w-full h-14 bg-primary text-white rounded-3xl font-black text-lg shadow-xl shadow-primary/20 disabled:opacity-50 disabled:shadow-none"
                  >
                    再来一局
                  </motion.button>
                  {!players.every(p => p.isReady) && (
                    <p className="text-center text-xs font-bold text-slate-400">等待所有玩家准备后可开始</p>
                  )}
                </div>
              )}

              {!isHost && (
                <div className="w-full text-center space-y-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const ws = wsRef.current;
                      const pid = roomPlayerId || myPlayer.id;
                      const me = players.find(p => p.id === pid);
                      if (ws && ws.readyState === WebSocket.OPEN) {
                        wsSendReady(ws, pid, !me?.isReady);
                      }
                    }}
                    className={`w-full h-14 rounded-3xl font-black text-lg shadow-xl ${
                      players.find(p => p.id === (roomPlayerId || myPlayer.id))?.isReady
                        ? 'bg-slate-200 text-slate-500 shadow-slate-200/20'
                        : 'bg-emerald-500 text-white shadow-emerald-500/20'
                    }`}
                  >
                    {players.find(p => p.id === (roomPlayerId || myPlayer.id))?.isReady ? '已准备 ✓' : '准备'}
                  </motion.button>
                  <p className="text-xs font-bold text-slate-400">等待房主发起下一局</p>
                </div>
              )}

              <button
                onClick={handleExit}
                className="text-sm font-bold text-slate-400 hover:text-red-500 transition-colors"
              >
                退出房间
              </button>
            </motion.div>
          )}

          {/* ——— 发言/投票阶段 ——— */}
          {(gameState.phase === '发言' || gameState.phase === '投票') && (
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
                isMe={gameState.phase === '发言' && gameState.currentSpeakerId === (roomPlayerId || myPlayer.id)}
                onSkip={handleSkipSpeaking}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {(gameState.phase === '大厅' || gameState.phase === '发言' || gameState.phase === '投票' || gameState.phase === '结果') && (
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
          onVoteClick={() => {
            const myId = roomPlayerId || myPlayer.id;
            const me = players.find(p => p.id === myId) || null;
            if (!me || me.status !== 'active') return;
            if (gameState.phase !== '投票') return;
            setIsVotingModalOpen(true);
          }}
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
          canVote={(() => {
            if (gameState.phase !== '投票') return false;
            const myId = roomPlayerId || myPlayer.id;
            const me = players.find(p => p.id === myId) || null;
            return Boolean(me && me.status === 'active');
          })()}
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
