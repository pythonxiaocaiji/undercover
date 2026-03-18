import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { Player } from '../types';
import { PlayerCard } from './PlayerCard';

interface VotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onVote: (playerId: string | null) => void;
  myPlayerId: string;
}

export const VotingModal: React.FC<VotingModalProps> = ({ isOpen, onClose, players, onVote, myPlayerId }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = () => {
    onVote(selectedId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="relative w-full max-w-lg bg-game-bg rounded-t-[40px] sm:rounded-[40px] overflow-hidden card-shadow"
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-slate-900">谁是卧底？</h2>
                  <p className="text-sm text-slate-400 font-medium">请选择一位玩家进行投票</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[min(60vh,420px)] overflow-y-auto pr-2 custom-scrollbar">
                {players
                  .filter(p => p.status !== 'eliminated')
                  .filter(p => p.id !== myPlayerId)
                  .map(player => (
                  <div key={player.id} className="relative">
                    <PlayerCard
                      player={player}
                      isSelectable
                      isSelected={selectedId === player.id}
                      onClick={() => setSelectedId(player.id)}
                    />
                    {player.votes && player.votes > 0 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg ring-2 ring-white">
                        {player.votes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedId(null)}
                  className="w-full h-12 flex items-center justify-center rounded-3xl font-bold text-slate-600 bg-white border border-slate-100"
                >
                  弃票
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  className="w-full h-16 flex items-center justify-center gap-2 rounded-3xl font-bold text-white shadow-xl transition-all bg-primary shadow-primary/20 hover:brightness-110"
                >
                  <Check className="w-6 h-6" />
                  <span>{selectedId ? '确认投票' : '确认弃票'}</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
