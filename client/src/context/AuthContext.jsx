import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('kirana_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name && parsed.name.includes('Rajesh')) {
          parsed.name = 'Guna (Owner)';
          localStorage.setItem('kirana_user', JSON.stringify(parsed));
        }
        return parsed;
      } catch (e) {}
    }
    return { id: 1, username: 'admin', name: 'Guna (Owner)', role: 'owner' };
  });
  const [token, setToken] = useState(() => localStorage.getItem('kirana_token') || 'demo-token');

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('kirana_user', JSON.stringify(res.data.user));
      localStorage.setItem('kirana_token', res.data.token);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Login failed' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('kirana_user');
    localStorage.removeItem('kirana_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
