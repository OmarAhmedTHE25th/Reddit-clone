import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import api, {
  AuthUser,
  setAccessToken,
  registerAuthFailureHandler,
} from '../api/axios';

export type AuthModalMode = 'login' | 'register' | null;

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authModal: AuthModalMode;
  openAuthModal: (mode: 'login' | 'register') => void;
  closeAuthModal: () => void;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateUser: (updated: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModal, setAuthModal] = useState<AuthModalMode>(null);

  const openAuthModal = useCallback((mode: 'login' | 'register') => {
    setAuthModal(mode);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModal(null);
  }, []);

  // Clear local user state if background token refresh fails
  useEffect(() => {
    registerAuthFailureHandler(() => {
      setUser(null);
    });
  }, []);

  // Silent session restore on app boot via HttpOnly refresh cookie
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const res = await api.post<{ accessToken: string; user: AuthUser }>(
          '/auth/refresh'
        );
        if (isMounted) {
          setAccessToken(res.data.accessToken);
          setUser(res.data.user);
        }
      } catch {
        // No active session cookie — stay logged out cleanly
        if (isMounted) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: AuthUser }>(
      '/auth/login',
      { identifier, password }
    );
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    setAuthModal(null);
    return res.data.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await api.post<{ accessToken: string; user: AuthUser }>(
      '/auth/register',
      payload
    );
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    setAuthModal(null);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updated: AuthUser) => {
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        authModal,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
