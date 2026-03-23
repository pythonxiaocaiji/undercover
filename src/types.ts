export type PlayerRole = '平民' | '卧底';
export type PlayerStatus = 'active' | 'voted' | 'eliminated';
export type GamePhase = '大厅' | '发言' | '投票' | '结果' | '结束' | '等待';

export interface FriendItem {
  request_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  is_incoming: boolean;
  user_id: string;
  phone: string;
  username: string;
  avatar: string;
  user_status?: string;
}

export interface UserPublicItem {
  id: string;
  username: string;
  avatar: string;
  user_status: string;
}

export interface RoomInviteItem {
  room_id: string;
  room_name: string;
  inviter_user_id: string;
  inviter_name: string;
  allow_join: boolean;
  allow_invite: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  status: PlayerStatus;
  isSpeaking?: boolean;
  isReady?: boolean;
  isHost?: boolean;
  hasSpoken?: boolean;
  role?: PlayerRole;
  word?: string;
  votes?: number;
}

export interface RoomConfig {
  roomName: string;
  playerCount: number;
  speakingTime: number;
  votingTime: number;
  wordCategory: string;
  undercoverCount: number;
  allowJoin: boolean;
  allowInvite: boolean;
}

export interface GameState {
  roomId: string;
  roomName: string;
  playerCount: number;
  maxPlayers: number;
  phase: GamePhase;
  timer: number;
  currentSpeakerId: string | null;
  round: number;
  winner?: '平民' | '卧底';
  allowJoin?: boolean;
  allowInvite?: boolean;
}
