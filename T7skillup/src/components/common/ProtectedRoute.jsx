/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication.
 * Redirects to login if user is not authenticated.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-600 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role if required
  if (requiredRole && userProfile?.role !== requiredRole) {
    // Redirect students trying to access admin routes
    if (requiredRole === 'admin' && userProfile?.role === 'student') {
      return <Navigate to="/dashboard" replace />;
    }
    // Redirect admins trying to access student routes
    if (requiredRole === 'student' && userProfile?.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
