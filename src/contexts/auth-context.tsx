import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  getSession,
  isSupabaseConfigured,
  signIn,
  signInAnonymously,
  signOut,
  signUp,
} from "@/integrations/supabase/api";
import { supabase } from "@/integrations/supabase/client";

type AuthMode = "live" | "mock";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  mode: AuthMode;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInAsDemo: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!isConfigured || !supabase) {
      setLoading(false);
      return;
    }

    getSession().then((s) => {
      setSession(s);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => sub.subscription.unsubscribe();
  }, [isConfigured]);

  const mode: AuthMode = isConfigured && session ? "live" : "mock";

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signIn(email, password);
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, name?: string) => {
      await signUp(email, password, name);
    },
    [],
  );

  const signInAsDemo = useCallback(async () => {
    if (isConfigured) {
      await signInAnonymously();
    }
  }, [isConfigured]);

  const logout = useCallback(async () => {
    if (isConfigured) await signOut();
    setSession(null);
  }, [isConfigured]);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      mode,
      isConfigured,
      signInWithEmail,
      signUpWithEmail,
      signInAsDemo,
      logout,
    }),
    [session, loading, mode, isConfigured, signInWithEmail, signUpWithEmail, signInAsDemo, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
