import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Vote, Trophy, Play } from 'lucide-react';
import { GamePhase } from '../types';

interface PhaseTransitionProps {
  phase: GamePhase;
  round?: number;
  show: boolean;
}

const phaseConfig: Record<GamePhase, { icon: React.ReactNode; title: string; subtitle: string; color: string; bgGradient: string }> = {
  '大厅': {
    icon: <Play className="w-16 h-16" />,
    title: '准备开始',
    subtitle: '等待所有玩家准备就绪',
    color: 'text-blue-accent',
    bgGradient: 'from-blue-accent/20 to-purple-accent/20'
  },
  '发言': {
    icon: <Mic className="w-16 h-16" />,
    title: '发言阶段',
    subtitle: '轮流描述你的词语',
    color: 'text-blue-accent',
    bgGradient: 'from-blue-accent/20 to-blue-500/20'
  },
  '投票': {
    icon: <Vote className="w-16 h-16" />,
    title: '投票阶段',
    subtitle: '投出你认为的卧底',
    color: 'text-primary',
    bgGradient: 'from-primary/20 to-red-500/20'
  },
  '结果': {
    icon: <Trophy className="w-12 h-12" />,
    title: '投票结果',
    subtitle: '查看本轮淘汰玩家',
    color: 'text-yellow-accent',
    bgGradient: 'from-yellow-accent/20 to-orange-500/20'
  },
  '结束': {
    icon: <Trophy className="w-16 h-16" />,
    title: '游戏结束',
    subtitle: '查看最终结果',
    color: 'text-emerald-accent',
    bgGradient: 'from-emerald-accent/20 to-green-500/20'
  },
  '等待': {
    icon: <Play className="w-16 h-16" />,
    title: '等待中',
    subtitle: '请稍候...',
    color: 'text-slate-400',
    bgGradient: 'from-slate-200/20 to-slate-300/20'
  }
};

export const PhaseTransition: React.FC<PhaseTransitionProps> = ({ phase, round, show }) => {
  const config = phaseConfig[phase] || phaseConfig['等待'];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotateY: 180 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20,
              duration: 0.6
            }}
            className={`relative bg-gradient-to-br ${config.bgGradient} backdrop-blur-xl rounded-3xl p-8 sm:p-12 shadow-2xl border border-white/20 max-w-sm mx-4`}
          >
            {/* Decorative circles */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.5, 0.2]
              }}
              transition={{ 
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
              className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"
            />

            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              {/* Icon with pulse animation */}
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className={`${config.color} drop-shadow-lg`}
              >
                {config.icon}
              </motion.div>

              {/* Round indicator */}
              {round && phase !== '大厅' && phase !== '结束' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="px-4 py-1.5 bg-white/90 rounded-full"
                >
                  <span className="text-sm font-black text-slate-700">第 {round} 轮</span>
                </motion.div>
              )}

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg"
              >
                {config.title}
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-base sm:text-lg font-medium text-white/90"
              >
                {config.subtitle}
              </motion.p>

              {/* Animated dots */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex gap-2 pt-2"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ 
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                    className="w-2 h-2 bg-white rounded-full"
                  />
                ))}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
