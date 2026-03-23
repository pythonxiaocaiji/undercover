import type { FriendItem, GameState, Player, RoomConfig, RoomInviteItem, UserPublicItem } from '../types';

function authHeaders() {
  const token = localStorage.getItem('undercover_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
  allowJoin?: boolean;
  allowInvite?: boolean;
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
      allow_join: params.config.allowJoin,
      allow_invite: params.config.allowInvite,
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

export function wsSendRestart(ws: WebSocket, hostPlayerId: string) {
  ws.send(JSON.stringify({ type: 'game:restart', payload: { hostPlayerId } }));
}

export function wsSendVote(ws: WebSocket, voterPlayerId: string, targetPlayerId: string | null) {
  ws.send(JSON.stringify({ type: 'vote', payload: { voterPlayerId, targetPlayerId } }));
}

export function wsSendReaction(ws: WebSocket, fromPlayerId: string, targetPlayerId: string, emoji: string) {
  ws.send(JSON.stringify({ type: 'reaction', payload: { fromPlayerId, targetPlayerId, emoji } }));
}

export function wsSendStateUpdate(ws: WebSocket, state: BackendRoomState) {
  ws.send(JSON.stringify({ type: 'state:update', payload: { state } }));
}

export type WordCategoryDto = { id: string; name: string };
export type WordPairDto = { id: string; category_id: string; civilian_word: string; undercover_word: string };

export async function listWordCategories(): Promise<WordCategoryDto[]> {
  const res = await fetch(`${httpBaseUrl()}/words/categories`, { method: 'GET' });
  await throwIfNotOk(res);
  return res.json();
}

export async function listWordPairs(categoryId: string): Promise<WordPairDto[]> {
  const url = `${httpBaseUrl()}/words/pairs?category_id=${encodeURIComponent(categoryId)}`;
  const res = await fetch(url, { method: 'GET' });
  await throwIfNotOk(res);
  return res.json();
}

export async function adminCreateWordCategory(name: string): Promise<WordCategoryDto> {
  const res = await fetch(`${httpBaseUrl()}/words/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name }),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function adminDeleteWordCategory(categoryId: string): Promise<void> {
  const res = await fetch(`${httpBaseUrl()}/words/categories/${encodeURIComponent(categoryId)}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  await throwIfNotOk(res);
}

export async function adminCreateWordPair(input: { category_id: string; civilian_word: string; undercover_word: string }): Promise<WordPairDto> {
  const res = await fetch(`${httpBaseUrl()}/words/pairs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function adminDeleteWordPair(pairId: string): Promise<void> {
  const res = await fetch(`${httpBaseUrl()}/words/pairs/${encodeURIComponent(pairId)}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  await throwIfNotOk(res);
}

export async function listFriends(): Promise<FriendItem[]> {
  const res = await fetch(`${httpBaseUrl()}/friends`, {
    method: 'GET',
    headers: { ...authHeaders() },
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function listFriendRequests(): Promise<FriendItem[]> {
  const res = await fetch(`${httpBaseUrl()}/friends/requests`, {
    method: 'GET',
    headers: { ...authHeaders() },
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function sendFriendRequest(targetPhone: string): Promise<FriendItem> {
  const res = await fetch(`${httpBaseUrl()}/friends/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ target_phone: targetPhone }),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function acceptFriendRequest(requestId: string): Promise<FriendItem> {
  const res = await fetch(`${httpBaseUrl()}/friends/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ request_id: requestId }),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  const res = await fetch(`${httpBaseUrl()}/friends/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ request_id: requestId }),
  });
  await throwIfNotOk(res);
}

export async function removeFriend(friendUserId: string): Promise<void> {
  const res = await fetch(`${httpBaseUrl()}/friends/${encodeURIComponent(friendUserId)}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  await throwIfNotOk(res);
}

export async function listRoomInvites(): Promise<RoomInviteItem[]> {
  const res = await fetch(`${httpBaseUrl()}/friends/invites`, {
    method: 'GET',
    headers: { ...authHeaders() },
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function clearRoomInvites(): Promise<void> {
  const res = await fetch(`${httpBaseUrl()}/friends/invites`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  await throwIfNotOk(res);
}

export async function inviteFriendToRoom(roomId: string, friendUserId: string): Promise<void> {
  const res = await fetch(`${httpBaseUrl()}/rooms/${encodeURIComponent(roomId)}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ friend_user_id: friendUserId }),
  });
  await throwIfNotOk(res);
}

export async function updateUserStatus(status: 'online' | 'busy'): Promise<void> {
  const res = await fetch(`${httpBaseUrl()}/auth/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status }),
  });
  await throwIfNotOk(res);
}

export async function listUsers(q?: string): Promise<UserPublicItem[]> {
  const url = q?.trim()
    ? `${httpBaseUrl()}/users?q=${encodeURIComponent(q.trim())}`
    : `${httpBaseUrl()}/users`;
  const res = await fetch(url, { method: 'GET', headers: { ...authHeaders() } });
  await throwIfNotOk(res);
  return res.json();
}

export function connectNotifyWs(userId: string): WebSocket {
  const token = localStorage.getItem('undercover_token') || '';
  const url = `${wsBaseUrl()}/ws/notify/${encodeURIComponent(userId)}?token=${encodeURIComponent(token)}`;
  return new WebSocket(url);
}
