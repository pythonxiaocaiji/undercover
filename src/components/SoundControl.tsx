import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../lib/sounds';

interface SoundControlProps {
  className?: string;
}

export const SoundControl: React.FC<SoundControlProps> = ({ className = '' }) => {
  const [muted, setMuted] = useState(soundManager.isMuted());
  const [volume, setVolume] = useState(soundManager.getVolume());
  const [showSlider, setShowSlider] = useState(false);

  useEffect(() => {
    // 初始化音效系统
    soundManager.init();
  }, []);

  const handleToggleMute = () => {
    const newMuted = soundManager.toggleMute();
    setMuted(newMuted);
    
    // 如果取消静音，播放一个测试音效
    if (!newMuted) {
      soundManager.play('notification');
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    soundManager.setVolume(newVolume);
    
    // 如果不是静音状态，播放测试音效
    if (!muted) {
      soundManager.play('notification');
    }
  };

  return (
    <div className={`relative ${className}`}>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleToggleMute}
        onMouseEnter={() => setShowSlider(true)}
        onMouseLeave={() => setShowSlider(false)}
        className="p-2 rounded-xl bg-white/80 backdrop-blur-sm card-shadow text-slate-600 hover:text-primary transition-colors"
        title={muted ? '取消静音' : '静音'}
      >
        {muted ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </motion.button>

      {/* Volume Slider */}
      <AnimatePresence>
        {showSlider && !muted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onMouseEnter={() => setShowSlider(true)}
            onMouseLeave={() => setShowSlider(false)}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-2xl p-3 card-shadow"
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-400">音量</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="text-xs font-black text-primary">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
