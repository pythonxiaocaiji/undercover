import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Crown } from 'lucide-react';
import { Player } from '../types';
import { cn } from '../lib/utils';

interface PlayerCardProps {
  player: Player;
  isSelectable?: boolean;
  isSelected?: boolean;
  isMe?: boolean;
  reaction?: string;
  onClick?: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, isSelectable, isSelected, isMe, reaction, onClick }) => {
  const isEliminated = player.status === 'eliminated';
  const isVoted = player.status === 'voted';
  const isActive = player.status === 'active';
  const showSpeakingProgress = !isEliminated && typeof player.hasSpoken === 'boolean';

  return (
    <motion.div
      whileHover={!isEliminated ? { y: -4, scale: 1.02 } : {}}
      whileTap={!isEliminated ? { scale: 0.98 } : {}}
      onClick={!isEliminated ? onClick : undefined}
      className={cn(
        "relative flex flex-col items-center p-4 rounded-3xl transition-all duration-300",
        "bg-white card-shadow",
        isEliminated && "opacity-50 grayscale",
        isVoted && "opacity-80",
        isSelected && "ring-4 ring-primary ring-offset-2",
        isMe && !isSelected && "ring-2 ring-blue-accent ring-offset-2",
        isActive && !isSelected && "hover:card-shadow-hover",
        isSelectable && "cursor-pointer"
      )}
    >
      {isMe && (
        <div className="absolute -top-2 right-3 z-10 bg-blue-accent text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm border border-white">
          我
        </div>
      )}
      {player.isHost && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 bg-yellow-accent text-slate-900 text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 border border-white">
          <Crown className="w-2.5 h-2.5" />
          <span>房主</span>
        </div>
      )}

      <AnimatePresence>
        {reaction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ opacity: 1, scale: 1.5, y: -40 }}
            exit={{ opacity: 0, scale: 0.5, y: -60 }}
            className="absolute top-0 z-30 text-3xl pointer-events-none"
          >
            {reaction}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <div className={cn(
          "w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-sm",
          player.isSpeaking && "ring-4 ring-blue-accent ring-offset-2 animate-pulse"
        )}>
          <img 
            src={player.avatar} 
            alt={player.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        {isVoted && (
          <div className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            已投票
          </div>
        )}
      </div>

      <span className="mt-3 text-sm font-bold text-slate-800 truncate w-full text-center">
        {player.name}
      </span>
      
      {isEliminated ? (
        <div className="mt-1 text-center space-y-0.5">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            已淘汰
          </span>
          {isMe && player.role && (
            <span className="block text-[10px] font-black text-slate-500">
              身份：{player.role}
            </span>
          )}
        </div>
      ) : showSpeakingProgress ? (
        <div className={cn(
          "mt-1 text-[10px] font-black",
          player.hasSpoken ? "text-slate-400" : "text-blue-accent"
        )}>
          {player.hasSpoken ? '已发言' : '未发言'}
        </div>
      ) : player.isReady ? (
        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-accent">
          <CheckCircle className="w-3 h-3" />
          <span>已准备</span>
        </div>
      ) : null}
    </motion.div>
  );
};
