import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'SECURITY_GUARD' | 'FACULTY' | 'DEPT_HEAD' | 'SECURITY_ADMIN';
  department?: string;
}

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isGuard: boolean;
  isAdmin: boolean;
  isApprover: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('abes_token');
    const savedUser = localStorage.getItem('abes_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('abes_token', newToken);
    localStorage.setItem('abes_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('abes_token');
    localStorage.removeItem('abes_user');
  };

  const isAuthenticated = !!token;
  const isGuard = user?.role === 'SECURITY_GUARD';
  const isAdmin = user?.role === 'SECURITY_ADMIN';
  const isApprover = user?.role === 'FACULTY' || user?.role === 'DEPT_HEAD' || user?.role === 'SECURITY_ADMIN';

  return (
    <AuthContext.Provider value={{
      token,
      user,
      login,
      logout,
      isAuthenticated,
      isGuard,
      isAdmin,
      isApprover,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
