import React from 'react';
import { motion } from 'motion/react';
import { Mic } from 'lucide-react';
import { Player } from '../types';

interface SpeakerFocusProps {
  player: Player | null;
  timer: number;
  maxTimer: number;
}

export const SpeakerFocus: React.FC<SpeakerFocusProps> = ({ player, timer, maxTimer }) => {
  if (!player) return null;

  const progress = (timer / maxTimer) * 100;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-4">
      <div className="relative flex items-center justify-center">
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
        <motion.div
          layoutId={`avatar-${player.id}`}
          className="absolute w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <img 
            src={player.avatar} 
            alt={player.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </motion.div>
        
        {/* Speaking Indicator */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-1 right-8 bg-blue-accent p-2 rounded-full border-2 border-white shadow-lg"
        >
          <Mic className="w-4 h-4 text-white" />
        </motion.div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-900">{player.name}</h2>
        <p className="text-sm text-slate-400 font-medium">正在发言...</p>
      </div>
    </div>
  );
};
