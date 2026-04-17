import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/user';
import authService from '../services/authService';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  loading: true,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Migrate token from localStorage to sessionStorage (one-time, for users already logged in)
    const legacyToken = localStorage.getItem('token');
    if (legacyToken && !sessionStorage.getItem('token')) {
      sessionStorage.setItem('token', legacyToken);
      localStorage.removeItem('token');
    }

    const token = sessionStorage.getItem('token');

    if (!token) {
      setLoading(false);
      return;
    }

    authService.getMe(token)
      .then((me) => {
        setUser(me);
      })
      .catch(() => {
        sessionStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const logout = () => {
    sessionStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
