import { useState } from 'react';
import { X, Lock, ChevronLeft, Sprout, Loader2 } from 'lucide-react';
import type { Sector } from '@/types';
import { supabase } from '@/lib/supabase';

type Props = {
  sector: Sector | null;
  onClose: () => void;
};

export default function LoginPrompt({ sector, onClose }: Props) {
  const [mode, setMode] = useState<'prompt' | 'signin' | 'signup'>('prompt');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    if (!email || !password) { setError('يرجى إدخال البريد وكلمة المرور'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onClose();
  };

  const handleSignUp = async () => {
    setError(null);
    if (!email || !password) { setError('يرجى إدخال البريد وكلمة المرور'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    // Auto sign-in after signup (email confirmation is off)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) { setError(signInError.message); return; }
    onClose();
  };
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[60] animate-slide-up shadow-float">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="px-6 pb-6 pt-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
              <Lock className="w-6 h-6 text-amber-600" />
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <Sprout className="w-4 h-4 text-siwar-600" />
            <h3 className="text-lg font-bold text-gray-800">تسجيل الدخول مطلوب</h3>
          </div>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            سجّل دخولك لإضافة فرصة داخل قطاع {sector?.name || ''} والوصول إلى الجهات المهتمة.
          </p>

          {mode === 'prompt' && (
            <div className="space-y-2.5">
              <button
                onClick={() => setMode('signin')}
                className="tap-scale w-full py-3.5 bg-gradient-to-l from-siwar-600 to-siwar-700 text-white rounded-xl text-sm font-bold hover:shadow-glow-siwar transition-all shadow-soft"
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => setMode('signup')}
                className="tap-scale w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
              >
                إنشاء حساب جديد
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {(mode === 'signin' || mode === 'signup') && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-siwar-400 focus:ring-2 focus:ring-siwar-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-siwar-400 focus:ring-2 focus:ring-siwar-100 outline-none transition-all"
                />
              </div>
              {error && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
              <button
                onClick={mode === 'signin' ? handleSignIn : handleSignUp}
                disabled={loading}
                className="tap-scale w-full py-3.5 bg-gradient-to-l from-siwar-600 to-siwar-700 text-white rounded-xl text-sm font-bold hover:shadow-glow-siwar transition-all shadow-soft disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
              </button>
              <button
                onClick={() => setMode('prompt')}
                className="tap-scale w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                رجوع
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
