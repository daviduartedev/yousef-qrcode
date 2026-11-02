'use client';
import { authClient } from '@/lib/auth-client';

export function useAuth() {
  const { data, isPending, error } = authClient.useSession();
  return {
    user: data?.user ?? null,
    session: data?.session ?? null,
    isLoading: isPending,
    isAuthenticated: Boolean(data?.user),
    error,
    signOut: async () => { await authClient.signOut(); },
  };
}
