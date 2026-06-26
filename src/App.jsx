/**
 * App router — four top-level routes:
 *
 *   /            ClientStorefront
 *   /admin/login AdminLogin
 *   /admin       AdminDashboard      (ProtectedRoute)
 *   /admin/new   AIProductCreator    (ProtectedRoute)
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import CinematicLanding from './components/CinematicLanding.jsx';
import ClientStorefront from './components/ClientStorefront.jsx';
import AdminLogin from './components/AdminLogin.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import AIProductCreator from './components/AIProductCreator.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { EASE } from './lib/motion.js';

export default function App() {
  return (
    // One global motion context: honor the OS "reduce motion" setting and give
    // every framer-motion transition the same premium default easing.
    <MotionConfig reducedMotion="user" transition={{ ease: EASE }}>
    <Routes>
      <Route path="/" element={<CinematicLanding />} />
      <Route path="/shop" element={<ClientStorefront />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/new"
        element={
          <ProtectedRoute>
            <AIProductCreator />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </MotionConfig>
  );
}
