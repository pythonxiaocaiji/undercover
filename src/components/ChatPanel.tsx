import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Send, X } from 'lucide-react';

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  avatar: string;
  message: string;
  timestamp: number;
  phase: string;
  isLastWords?: boolean;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  myPlayerId: string;
  onSend: (message: string, isLastWords?: boolean) => void;
  onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, myPlayerId, onSend, onClose }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed bottom-24 right-4 w-72 sm:w-80 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 z-40 overflow-hidden"
      style={{ maxHeight: '60vh' }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-primary/5 to-purple-500/5">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="font-black text-sm text-slate-800">局内聊天</span>
          {messages.length > 0 && (
            <span className="text-xs text-slate-400">{messages.length}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-xs text-slate-400 py-6">暂无消息，发个招呼吧</div>
        )}
        <AnimatePresence initial={false}>
          {messages.map(msg => {
            const isMe = msg.playerId === myPlayerId;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: isMe ? 20 : -20, y: 4 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <img
                  src={msg.avatar}
                  alt=""
                  className="w-7 h-7 rounded-lg flex-shrink-0 object-cover self-end"
                  referrerPolicy="no-referrer"
                />
                <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <span className="text-xs text-slate-400 px-1">{msg.playerName}</span>
                  )}
                  {msg.isLastWords && (
                    <span className="text-xs font-bold text-amber-600 px-1">💬 临终发言</span>
                  )}
                  <div
                    className={`px-3 py-1.5 rounded-2xl text-sm leading-snug break-words ${
                      isMe
                        ? 'bg-primary text-white rounded-tr-sm'
                        : msg.isLastWords
                          ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tl-sm'
                          : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className="px-3 py-2.5 border-t border-slate-100 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="说点什么…"
          maxLength={200}
          className="flex-1 px-3 py-1.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-primary transition-colors"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          disabled={!input.trim()}
          className="w-8 h-8 flex items-center justify-center bg-primary rounded-xl disabled:opacity-40 transition-opacity flex-shrink-0"
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </motion.button>
      </div>
    </motion.div>
  );
};

interface ChatToggleButtonProps {
  unread: number;
  isOpen: boolean;
  onClick: () => void;
}

export const ChatToggleButton: React.FC<ChatToggleButtonProps> = ({ unread, isOpen, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`relative w-10 h-10 flex items-center justify-center rounded-2xl shadow-md border transition-colors ${
      isOpen ? 'bg-primary border-primary/20' : 'bg-white border-slate-100'
    }`}
  >
    <MessageCircle className={`w-5 h-5 ${isOpen ? 'text-white' : 'text-slate-600'}`} />
    <AnimatePresence>
      {unread > 0 && !isOpen && (
        <motion.span
          key="badge"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none"
        >
          {unread > 9 ? '9+' : unread}
        </motion.span>
      )}
    </AnimatePresence>
  </motion.button>
);
