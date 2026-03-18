import type { GameState, Player, RoomConfig } from '../types';

export type BackendRoomState = {
  roomId: string;
  roomName: string;
  maxPlayers: number;
  phase: GameState['phase'];
  timer: number;
  speakingTime: number;
  votingTime: number;
  wordCategory: string;
  undercoverCount: number;
  round: number;
  currentSpeakerId: string | null;
  votesBy?: Record<string, string>;
  eliminatedPlayerId?: string | null;
  winner?: '平民' | '卧底';
  players: Array<{
    id: string;
    name: string;
    avatar: string;
    status: Player['status'];
    role?: Player['role'];
    isHost?: boolean;
    isReady?: boolean;
    votes?: number;
  }>;
  reactions?: Record<string, string>;
};

function httpBaseUrl() {
  return (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:8000';
}

function wsBaseUrl() {
  const http = httpBaseUrl();
  return http.replace(/^http/, 'ws');
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;

  try {
    const data = await res.json();
    const detail = (data as any)?.detail;

    if (typeof detail === 'string' && detail) {
      throw new Error(detail);
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const msg = detail?.[0]?.msg;
      if (typeof msg === 'string' && msg) {
        throw new Error(msg);
      }
    }
  } catch {
  }

  throw new Error(`request_failed_${res.status}`);
}

export async function createRoom(params: {
  roomName: string;
  maxPlayers: number;
  config: RoomConfig;
  host: Pick<Player, 'id' | 'name' | 'avatar'>;
}): Promise<{ roomId: string; playerId: string }> {
  const res = await fetch(`${httpBaseUrl()}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      room_name: params.roomName,
      max_players: params.maxPlayers,
      speaking_time: params.config.speakingTime,
      voting_time: params.config.votingTime,
      word_category: params.config.wordCategory,
      undercover_count: params.config.undercoverCount,
      host_player_id: params.host.id,
      host_player_name: params.host.name,
      host_avatar: params.host.avatar,
    }),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function joinRoom(params: {
  roomId: string;
  player: Pick<Player, 'id' | 'name' | 'avatar'>;
}): Promise<{ roomId: string; playerId: string }> {
  const res = await fetch(`${httpBaseUrl()}/rooms/${params.roomId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      player_id: params.player.id,
      player_name: params.player.name,
      avatar: params.player.avatar,
    }),
  });
  await throwIfNotOk(res);
  return res.json();
}

export function connectRoomWs(roomId: string, playerId: string): WebSocket {
  const url = `${wsBaseUrl()}/ws/rooms/${roomId}?playerId=${encodeURIComponent(playerId)}`;
  return new WebSocket(url);
}

export function wsSendReady(ws: WebSocket, playerId: string, isReady: boolean) {
  ws.send(JSON.stringify({ type: 'player:ready', payload: { playerId, isReady } }));
}

export function wsSendStart(ws: WebSocket, hostPlayerId: string) {
  ws.send(JSON.stringify({ type: 'game:start', payload: { hostPlayerId } }));
}

export function wsSendVote(ws: WebSocket, voterPlayerId: string, targetPlayerId: string) {
  ws.send(JSON.stringify({ type: 'vote', payload: { voterPlayerId, targetPlayerId } }));
}

export function wsSendReaction(ws: WebSocket, fromPlayerId: string, targetPlayerId: string, emoji: string) {
  ws.send(JSON.stringify({ type: 'reaction', payload: { fromPlayerId, targetPlayerId, emoji } }));
}

export function wsSendStateUpdate(ws: WebSocket, state: BackendRoomState) {
  ws.send(JSON.stringify({ type: 'state:update', payload: { state } }));
}
