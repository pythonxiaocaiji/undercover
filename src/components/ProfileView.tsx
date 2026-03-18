import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Image as ImageIcon, User } from 'lucide-react';
import type { UserProfile } from '../services/auth';

interface ProfileViewProps {
  me: UserProfile;
  onUpdated: (next: UserProfile) => void;
  onBack: () => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ me, onUpdated, onBack, onLogout }) => {
  const [username, setUsername] = useState(me.username || '');
  const [avatar, setAvatar] = useState(me.avatar || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const svc = await import('../services/auth');
      const next = await svc.updateProfile({ username, avatar });
      onUpdated(next);
      onBack();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const onPickFile = async (f: File | null) => {
    if (!f) return;
    setError(null);
    setUploading(true);
    try {
      const svc = await import('../services/auth');
      const next = await svc.uploadAvatar(f);
      onUpdated(next);
      setAvatar(next.avatar);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-game-bg flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white rounded-[40px] p-8 card-shadow space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-900">个人设置</h2>
          <p className="text-slate-400 font-medium">手机号：{me.phone}</p>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-slate-50">
            <img src={avatar || me.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </div>

        <div className="flex items-center justify-center">
          <label className="w-full">
            <div className={`w-full h-12 flex items-center justify-center rounded-2xl font-black shadow-sm transition-all cursor-pointer ${
              uploading ? 'bg-slate-100 text-slate-400' : 'bg-primary text-white hover:brightness-110'
            }`}>
              {uploading ? '上传中...' : '上传头像'}
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => onPickFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <User className="w-5 h-5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名"
              className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-bold rounded-2xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onBack}
              className="flex-1 h-14 bg-slate-100 text-slate-500 rounded-3xl font-black"
            >
              返回
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={save}
              disabled={saving}
              className="flex-1 h-14 bg-primary text-white rounded-3xl font-black shadow-xl shadow-primary/20"
            >
              {saving ? '保存中...' : '保存'}
            </motion.button>
          </div>

          <button onClick={onLogout} className="w-full text-sm font-black text-red-500 hover:text-red-600">
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
};
