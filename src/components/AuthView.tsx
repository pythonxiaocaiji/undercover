import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Phone, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: () => void;
  onRegisterSuccess: () => void;
  onSkip?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess, onRegisterSuccess, onSkip }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadCaptcha = async () => {
    try {
      const svc = await import('../services/auth');
      const c = await svc.getCaptcha();
      setCaptchaId(c.captcha_id);
      setCaptchaImage(c.image_data);
      setCaptchaCode('');
    } catch {
    }
  };

  React.useEffect(() => {
    loadCaptcha();
  }, [mode]);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const svc = await import('../services/auth');
      if (mode === 'register') {
        await svc.registerWithCaptcha(phone, password, captchaId, captchaCode);
        setMode('login');
        await loadCaptcha();
        setError('注册成功，请输入新验证码后登录');
      } else {
        await svc.login(phone, password, captchaId, captchaCode);
        onLoginSuccess();
      }
    } catch (e: any) {
      setError(String(e?.message || e));
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-game-bg flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white rounded-[40px] p-8 card-shadow space-y-8 overflow-hidden">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-900">{mode === 'login' ? '登录' : '注册'}</h2>
          <p className="text-slate-400 font-medium">使用手机号与密码</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Phone className="w-5 h-5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.trim())}
              placeholder="手机号 (11位)"
              className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="w-5 h-5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码 (至少6位，含字母+数字)"
              className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-12 font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors"
              title={showPassword ? '隐藏密码' : '显示密码'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="text-xs font-bold text-slate-400 px-1">
            密码规则：至少 6 位，且必须包含字母和数字
          </div>

          <div className="flex items-stretch gap-3">
            <input
              value={captchaCode}
              onChange={(e) => setCaptchaCode(e.target.value)}
              placeholder="验证码"
              className="flex-1 min-w-0 bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all"
            />

            <button
              type="button"
              onClick={loadCaptcha}
              className="w-28 sm:w-32 h-12 shrink-0 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:brightness-105 transition-all"
              title="点击刷新验证码"
            >
              {captchaImage ? (
                <img src={captchaImage} alt="captcha" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-black text-slate-400">加载中</div>
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-bold rounded-2xl px-4 py-3">
              {error}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={submit}
            disabled={loading}
            className="w-full h-14 bg-primary text-white rounded-3xl font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
          >
            {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            <span>{loading ? '处理中...' : mode === 'login' ? '登录' : '注册并登录'}</span>
          </motion.button>

          <div className="flex items-center justify-between text-sm font-bold">
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-slate-400 hover:text-slate-600"
            >
              {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
            </button>
            {onSkip && (
              <button onClick={onSkip} className="text-slate-400 hover:text-slate-600">游客进入</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
