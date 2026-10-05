// App.jsx — root component with routing, auth, TanStack Query, and Sonner toast notifications
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Pages
import Login        from './pages/Login';
import Signup       from './pages/Signup';
import Dashboard    from './pages/Dashboard';
import FoodDetection from './pages/FoodDetection';
import AICoach      from './pages/AICoach';
import FoodLog      from './pages/FoodLog';
import DietPlanner  from './pages/DietPlanner';
import Progress     from './pages/Progress';

// Initialize TanStack Query client with production defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Layout wrapper for authenticated pages (shows navbar)
function AuthenticatedLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* AuthProvider makes user state accessible everywhere */}
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected routes — require login */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Dashboard />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/detect" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <FoodDetection />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/ai-coach" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <AICoach />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/log" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <FoodLog />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/diet-planner" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <DietPlanner />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/progress" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Progress />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            {/* Default: redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      {/* Sleek toast notification provider */}
      <Toaster richColors position="top-right" closeButton theme="dark" />
    </QueryClientProvider>
  );
}
