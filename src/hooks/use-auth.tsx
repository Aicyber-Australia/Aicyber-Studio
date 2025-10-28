"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { useEffect } from "react";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setSession: (session) =>
        set({
          session,
          user: session?.user || null,
          isAuthenticated: !!session?.user,
        }),

      setIsLoading: (isLoading) => set({ isLoading }),

      signOut: async () => {
        set({ isLoading: true });
        try {
          await supabase.auth.signOut();
          set({
            user: null,
            session: null,
            isAuthenticated: false,
          });
        } catch (error) {
          console.error("Error signing out:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      initialize: async () => {
        set({ isLoading: true });
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          set({
            session,
            user: session?.user || null,
            isAuthenticated: !!session?.user,
          });
        } catch (error) {
          console.error("Error initializing auth:", error);
          set({
            user: null,
            session: null,
            isAuthenticated: false,
          });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Hook to manage authentication state and listen to auth changes
 */
export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    // Initialize auth state
    store.initialize();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      store.setSession(session);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [store]);

  return {
    user: store.user,
    session: store.session,
    isLoading: store.isLoading,
    isAuthenticated: store.isAuthenticated,
    signOut: store.signOut,
  };
}

/**
 * Hook to get the current user without subscribing to changes
 */
export function useUser() {
  return useAuthStore((state) => state.user);
}

/**
 * Hook to check if the user is authenticated without subscribing to changes
 */
export function useIsAuthenticated() {
  return useAuthStore((state) => state.isAuthenticated);
}

/**
 * Hook to get the current session without subscribing to changes
 */
export function useSession() {
  return useAuthStore((state) => state.session);
}
