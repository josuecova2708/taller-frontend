import Cookies from 'js-cookie';
import { api } from './api';
import type { PermissionValue } from './permissions';

export const TOKEN_COOKIE = 'accessToken';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  roleLabel: string;
  permissions: PermissionValue[];
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

/**
 * El token vive en una cookie (no en localStorage) para que `middleware.ts`
 * pueda decidir el redirect antes de renderizar el dashboard.
 *
 * Nota: la cookie no es httpOnly, así que frente a XSS no es más segura que
 * localStorage. Su propósito es el enrutamiento; la defensa real son los
 * guards del backend.
 */
export const tokenStorage = {
  get: (): string | undefined => Cookies.get(TOKEN_COOKIE),
  set: (token: string) => {
    Cookies.set(TOKEN_COOKIE, token, {
      expires: 7,
      sameSite: 'lax',
      secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
      path: '/',
    });
  },
  clear: () => Cookies.remove(TOKEN_COOKIE, { path: '/' }),
};

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    tokenStorage.set(data.accessToken);
    return data;
  },

  me: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },

  logout: () => {
    tokenStorage.clear();
    window.location.href = '/login';
  },
};

export function hasPermission(user: User | null, permission: PermissionValue): boolean {
  return !!user?.permissions?.includes(permission);
}
