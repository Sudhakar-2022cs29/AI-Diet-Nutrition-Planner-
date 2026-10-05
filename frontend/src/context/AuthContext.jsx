// AuthContext — global authentication state
// Wraps the app so any component can access the current user
import { createContext, useContext, useState } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Load user from localStorage on first render (persistence across page reloads)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  // Signup — create account
  const signup = async (formData) => {
    setLoading(true);
    try {
      // Coerce numeric fields to numbers
      const payload = {
        ...formData,
        weight: formData.weight ? Number(formData.weight) : 70,
        height: formData.height ? Number(formData.height) : 170,
        age: formData.age ? Number(formData.age) : 25
      };

      const { data } = await authAPI.signup(payload);
      // Store token and user info in localStorage
      localStorage.setItem('token', data.token || data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'Signup failed';
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  // Login — authenticate user
  const login = async (formData) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login(formData);
      localStorage.setItem('token', data.token || data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'Login failed';
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  // Logout — clear session
  const logout = () => {
    try {
      authAPI.logout().catch(() => {});
    } catch {
      // Session cleanup below must still run if the request throws synchronously
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Update user in context + localStorage after profile edit
  const updateUser = (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easy context access
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
