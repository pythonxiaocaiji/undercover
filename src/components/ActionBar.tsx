import React from 'react';
import { Eye, Smile, Vote, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ActionBarProps {
  onVoteClick: () => void;
  onChatClick: () => void;
  onEmojiClick: () => void;
  onReadyClick?: () => void;
  onStartClick?: () => void;
  canVote: boolean;
  isLobby?: boolean;
  isReady?: boolean;
  isHost?: boolean;
  canStart?: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({ 
  onVoteClick, 
  onChatClick, 
  onEmojiClick, 
  onReadyClick,
  onStartClick,
  canVote, 
  isLobby,
  isReady,
  isHost,
  canStart
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-game-bg via-game-bg to-transparent pointer-events-none">
      <div className="max-w-md mx-auto flex items-center justify-between gap-4 pointer-events-auto">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onChatClick}
          className="w-14 h-14 flex items-center justify-center bg-white rounded-2xl card-shadow text-slate-400 hover:text-slate-600 transition-colors"
          title="查看词语"
        >
          <Eye className="w-6 h-6" />
        </motion.button>

        {isLobby ? (
          isHost && canStart ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartClick}
              className="flex-1 h-14 flex items-center justify-center gap-2 rounded-2xl font-bold text-white shadow-lg transition-all bg-emerald-500 shadow-emerald-500/20 hover:brightness-110"
            >
              <CheckCircle className="w-5 h-5" />
              <span>开始游戏</span>
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onReadyClick}
              className={`flex-1 h-14 flex items-center justify-center gap-2 rounded-2xl font-bold text-white shadow-lg transition-all ${
                isReady 
                  ? 'bg-emerald-500 shadow-emerald-500/20' 
                  : 'bg-primary shadow-primary/20 hover:brightness-110'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              <span>{isReady ? '已准备' : '准备游戏'}</span>
            </motion.button>
          )
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onVoteClick}
            disabled={!canVote}
            className={`flex-1 h-14 flex items-center justify-center gap-2 rounded-2xl font-bold text-white shadow-lg transition-all ${
              canVote 
                ? 'bg-primary shadow-primary/20 hover:brightness-110' 
                : 'bg-slate-200 cursor-not-allowed'
            }`}
          >
            <Vote className="w-5 h-5" />
            <span>立即投票</span>
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onEmojiClick}
          className="w-14 h-14 flex items-center justify-center bg-white rounded-2xl card-shadow text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Smile className="w-6 h-6" />
        </motion.button>
      </div>
    </div>
  );
};
