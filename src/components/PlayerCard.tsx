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
  chatBubble?: string;
  onClick?: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, isSelectable, isSelected, isMe, reaction, chatBubble, onClick }) => {
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
        "relative flex flex-col items-center p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all duration-300",
        "bg-white card-shadow",
        isEliminated && "opacity-50 grayscale",
        isVoted && "opacity-80",
        isSelected && "ring-2 sm:ring-4 ring-primary ring-offset-1 sm:ring-offset-2",
        isMe && !isSelected && "ring-2 ring-blue-accent ring-offset-1 sm:ring-offset-2",
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

      <AnimatePresence>
        {chatBubble && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: -4, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-20 bg-white rounded-xl px-2 py-1 shadow-lg border border-slate-100 max-w-[110px] pointer-events-none"
          >
            <p className="text-[10px] font-semibold text-slate-700 truncate whitespace-nowrap leading-tight">{chatBubble}</p>
            <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r border-b border-slate-100 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <div className={cn(
          "w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white shadow-sm",
          player.isSpeaking && "ring-2 sm:ring-4 ring-blue-accent ring-offset-1 sm:ring-offset-2 animate-pulse"
        )}>
          <img 
            src={player.avatar} 
            alt={player.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        {isVoted && (
          <div className="absolute -top-1 -right-1 bg-primary text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm">
            已投票
          </div>
        )}
      </div>

      <span className="mt-2 sm:mt-3 text-xs sm:text-sm font-bold text-slate-800 truncate w-full text-center">
        {player.name}
      </span>
      
      {isEliminated ? (
        <div className="mt-1 text-center space-y-0.5">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            已淘汰
          </span>
          {player.role && (
            <span className="block text-[10px] font-black text-slate-500">
              身份：{player.role}
            </span>
          )}
        </div>
      ) : player.isSpeaking ? (
        <div className="mt-1 text-[10px] font-black text-primary animate-pulse">
          发言中
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
