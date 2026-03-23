import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, SkipForward } from 'lucide-react';
import { Player } from '../types';

interface SpeakerFocusProps {
  player: Player | null;
  timer: number;
  maxTimer: number;
  isMe?: boolean;
  onSkip?: () => void;
}

export const SpeakerFocus: React.FC<SpeakerFocusProps> = ({ player, timer, maxTimer, isMe, onSkip }) => {
  const [showMyTurnHint, setShowMyTurnHint] = useState(false);

  useEffect(() => {
    if (isMe) {
      setShowMyTurnHint(true);
      const t = setTimeout(() => setShowMyTurnHint(false), 3000);
      return () => clearTimeout(t);
    } else {
      setShowMyTurnHint(false);
    }
  }, [isMe, player?.id]);

  if (!player) return null;

  const progress = (timer / maxTimer) * 100;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-4">
      <div className="relative flex items-center justify-center">
        {/* My-turn glow ring */}
        {isMe && (
          <motion.div
            className="absolute w-44 h-44 rounded-full border-4 border-primary/40"
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {/* Progress Ring */}
        <svg className="w-40 h-40 transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className="text-slate-100"
          />
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.5, ease: "linear" }}
            className="text-blue-accent"
            strokeLinecap="round"
          />
        </svg>

        {/* Avatar */}
        <div
          className="absolute w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl animate-[speaker-pulse_2s_ease-in-out_infinite]"
          style={{ animation: 'speaker-pulse 2s ease-in-out infinite' }}
        >
          <img 
            src={player.avatar} 
            alt={player.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        {/* Speaking Indicator */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-1 right-8 bg-blue-accent p-2 rounded-full border-2 border-white shadow-lg"
        >
          <Mic className="w-4 h-4 text-white" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isMe && showMyTurnHint && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-primary text-white text-sm font-black px-5 py-2 rounded-full shadow-lg shadow-primary/30 z-20"
          >
            🎤 轮到你发言了！
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-slate-900">{player.name}</h2>
        <p className="text-sm text-slate-400 font-medium">{isMe ? '轮到你了，开始发言吧' : '正在发言...'}</p>
        {isMe && onSkip && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSkip}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white rounded-2xl card-shadow text-sm font-bold text-slate-500 hover:text-primary transition-colors"
          >
            <SkipForward className="w-4 h-4" />
            <span>结束发言</span>
          </motion.button>
        )}
      </div>
    </div>
  );
};
