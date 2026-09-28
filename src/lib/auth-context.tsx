'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, hasPermission, type User } from './auth';
import type { PermissionValue } from './permissions';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  can: (permission: PermissionValue) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  can: () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // El middleware ya garantizó que hay cookie; acá se resuelve la identidad
    // real y los permisos efectivos. Si el token es inválido, el interceptor
    // de `api.ts` redirige al login.
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        can: (permission) => hasPermission(user, permission),
        logout: authApi.logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
