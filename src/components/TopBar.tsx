import React from 'react';
import { Users, Timer, LogOut } from 'lucide-react';
import { GamePhase } from '../types';

interface TopBarProps {
  roomName: string;
  roomId?: string;
  playerCount: number;
  maxPlayers: number;
  phase: GamePhase;
  timer: number;
  round?: number;
  onExit?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ roomName, roomId, playerCount, maxPlayers, phase, timer, round, onExit }) => {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-100">
      <div className="flex items-center gap-4">
        {onExit && (
          <button 
            onClick={onExit}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
            title="退出房间"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">{roomName}</h1>
            {roomId && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-wider">
                ID: {roomId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Users className="w-3 h-3" />
            <span>{playerCount}/{maxPlayers} 位玩家</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className={`text-[10px] uppercase tracking-widest font-bold ${
            phase === '投票' ? 'text-primary' : 'text-blue-accent'
          }`}>
            {phase !== '大厅' && round ? `第${round}轮 · ` : ''}{phase}阶段
          </span>
          {phase !== '大厅' && (
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <Timer className="w-4 h-4 text-slate-400" />
              <span className="tabular-nums">{timer}s</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
