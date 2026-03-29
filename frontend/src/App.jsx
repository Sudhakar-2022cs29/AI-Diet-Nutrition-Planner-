// App.jsx — root component with routing and auth
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Pages
import Login        from './pages/Login';
import Signup       from './pages/Signup';
import Dashboard    from './pages/Dashboard';
import FoodDetection from './pages/FoodDetection';
import FoodLog      from './pages/FoodLog';
import DietPlanner  from './pages/DietPlanner';
import Progress     from './pages/Progress';

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
  );
}
