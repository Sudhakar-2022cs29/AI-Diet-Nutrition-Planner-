// ProtectedRoute — redirects unauthenticated users to login
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  // If no user in context, send to login page
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
