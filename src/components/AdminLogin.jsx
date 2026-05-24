/**
 * AdminLogin — Firebase email/password sign-in for the admin panel.
 *
 * Honors VITE_ADMIN_EMAILS allowlist via isAdminUser; non-admin accounts
 * are immediately signed back out with an Arabic error message.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { Sparkles, Mail, Lock, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { auth, isAdminUser } from '../firebase.js';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/admin';

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && isAdminUser(user)) navigate(redirectTo, { replace: true });
    });
    return unsub;
  }, [navigate, redirectTo]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!isAdminUser(cred.user)) {
        await signOut(auth);
        throw new Error('هذا الحساب غير مصرّح له بدخول الإدارة.');
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const code = err?.code || '';
      let msg = err?.message || 'فشل تسجيل الدخول';
      if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
        msg = 'البريد أو كلمة المرور غير صحيحة.';
      } else if (code.includes('too-many-requests')) {
        msg = 'محاولات كثيرة. حاولي بعد قليل.';
      } else if (code.includes('network')) {
        msg = 'مشكلة في الشبكة. تأكّدي من اتصالكِ.';
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pearl px-4">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-sage/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blush/30 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-ink/60 hover:text-ink text-sm mb-6">
          <ArrowLeft className="w-4 h-4" />
          العودة إلى المتجر
        </Link>

        <div className="glass rounded-3xl p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-sage-blush flex items-center justify-center text-white shadow-bloom mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="font-display text-3xl">أفنان</h1>
            <p className="text-sm text-ink/60 mt-1 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sage" />
              لوحة الإدارة
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field pr-10"
                  placeholder="admin@afnan.com"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="label">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field pr-10"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-blush bg-blush/10 border border-blush/20 rounded-2xl px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-3.5 disabled:opacity-60">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الدخول...</> : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
