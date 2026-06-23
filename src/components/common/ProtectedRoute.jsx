import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // While auth is loading or profile is fetching, show a spinner — don't redirect yet
  if (loading || (user && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login but save current location for post-login redirection
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && (!profile || !allowedRoles.includes(profile.role))) {
    // If authenticated but role is invalid, redirect to respective dashboard
    if (profile?.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (profile?.role === 'trainee') {
      return <Navigate to="/trainee" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
