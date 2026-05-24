/**
 * App router — four top-level routes:
 *
 *   /            ClientStorefront
 *   /admin/login AdminLogin
 *   /admin       AdminDashboard      (ProtectedRoute)
 *   /admin/new   AIProductCreator    (ProtectedRoute)
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import ClientStorefront from './components/ClientStorefront.jsx';
import AdminLogin from './components/AdminLogin.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import AIProductCreator from './components/AIProductCreator.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ClientStorefront />} />
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
  );
}
