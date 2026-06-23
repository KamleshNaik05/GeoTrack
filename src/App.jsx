import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/common/Layout';
import { Toaster } from 'react-hot-toast';

// Lazy loading pages for performance
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import AdminDashboard from './pages/admin/AdminDashboard';
import LiveTracking from './pages/admin/LiveTracking';
import TraineesList from './pages/admin/TraineesList';
import TraineeDetail from './pages/admin/TraineeDetail';
import AttendancePanel from './pages/admin/AttendancePanel';
import AlertsPanel from './pages/admin/AlertsPanel';
import GeofenceManager from './pages/admin/GeofenceManager';

import TraineeDashboard from './pages/trainee/TraineeDashboard';
import MyAttendance from './pages/trainee/MyAttendance';
import MyAlerts from './pages/trainee/MyAlerts';

import { useAuth } from './hooks/useAuth';

// Root gatekeeper that performs initial redirect based on roles
function RootRedirect() {
  const { user, profile, loading } = useAuth();

  // While auth is loading or profile is fetching, show a spinner — don't redirect yet
  if (loading || (user && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (profile?.role === 'trainee') {
    return <Navigate to="/trainee" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Core Layout Gateway */}
          <Route path="/" element={<Layout />}>
            {/* Root Gateway redirect */}
            <Route index element={<RootRedirect />} />

            {/* Admin Dashboard views */}
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/tracking"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <LiveTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/trainees"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <TraineesList />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/trainees/:id"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <TraineeDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/attendance"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AttendancePanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/alerts"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AlertsPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/geofence"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <GeofenceManager />
                </ProtectedRoute>
              }
            />

            {/* Trainee Dashboard views */}
            <Route
              path="trainee"
              element={
                <ProtectedRoute allowedRoles={['trainee']}>
                  <TraineeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="trainee/attendance"
              element={
                <ProtectedRoute allowedRoles={['trainee']}>
                  <MyAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="trainee/alerts"
              element={
                <ProtectedRoute allowedRoles={['trainee']}>
                  <MyAlerts />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      {/* Styled notifications toaster */}
      <Toaster
        position={window.innerWidth < 768 ? 'top-center' : 'top-right'}
        toastOptions={{
          className: 'text-xs font-sans',
          style: {
            padding: '12px',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            maxWidth: window.innerWidth < 768 ? 'calc(100vw - 32px)' : '350px',
            width: window.innerWidth < 768 ? 'calc(100vw - 32px)' : 'auto',
          },
        }}
      />
    </AuthProvider>
  );
}
