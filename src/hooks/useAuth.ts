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
    signOut: async () => {
      const result = await authClient.signOut();
      if (result.error) throw new Error('Sign-out failed.');
    },
  };
}
