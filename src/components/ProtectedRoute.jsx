/**
 * ProtectedRoute — gate around any /admin/* page.
 *
 * Subscribes to Firebase Auth state; while resolving shows a soft splash,
 * then either renders children or redirects to /admin/login.
 *
 * Allowlist is enforced via isAdminUser() (see firebase.js).
 */
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, isAdminUser } from '../firebase.js';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && !isAdminUser(u)) {
        await signOut(auth);
        setAuthorized(false);
      } else {
        setAuthorized(!!u);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pearl">
        <div className="glass rounded-3xl px-8 py-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-sage" />
          <span className="text-ink/70">جاري التحقق...</span>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
