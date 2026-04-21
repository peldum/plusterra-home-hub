import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resetQueryLoopGuard } from '@/lib/queryLoopGuard';

type AppRole = 'superadmin' | 'admin' | 'agent' | 'accounting' | 'secretaria';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: { full_name: string; email: string; avatar_url: string | null; status: string } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const inFlightFetchRef = useRef<Promise<void> | null>(null);
  const lastFetchRef = useRef<{ userId: string; at: number } | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  const fetchUserData = useCallback(async (userId: string, force = false) => {
    const now = Date.now();
    const lastFetch = lastFetchRef.current;

    // Strong dedupe: same user already fetched within 5 minutes → skip entirely.
    // This prevents a re-fetch storm on TOKEN_REFRESHED / repeated auth events.
    if (!force && lastFetch?.userId === userId && now - lastFetch.at < 5 * 60 * 1000) {
      return;
    }

    if (inFlightFetchRef.current) {
      return inFlightFetchRef.current;
    }

    const fetchPromise = (async () => {
      try {
        const [roleRes, profileRes] = await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', userId).single(),
          supabase.from('profiles').select('full_name, email, avatar_url, status').eq('id', userId).single(),
        ]);

        if (roleRes.data) setRole(roleRes.data.role as AppRole);
        if (profileRes.data) setProfile(profileRes.data);
        lastFetchRef.current = { userId, at: Date.now() };
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    })().finally(() => {
      inFlightFetchRef.current = null;
    });

    inFlightFetchRef.current = fetchPromise;
    await fetchPromise;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'TOKEN_REFRESHED') {
          // Token renewed — clear guard backoff so fresh queries can fly
          resetQueryLoopGuard();
        }

        if (event === 'SIGNED_OUT') {
          setRole(null);
          setProfile(null);
          inFlightFetchRef.current = null;
          lastFetchRef.current = null;
          resetQueryLoopGuard();
          queryClient.clear();
          return;
        }

        if (newSession?.user) {
          setTimeout(() => {
            if (isMounted) void fetchUserData(newSession.user.id);
          }, 0);
        } else {
          setRole(null);
          setProfile(null);
          inFlightFetchRef.current = null;
          lastFetchRef.current = null;
        }
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (!isMounted) return;

        let activeSession = existingSession;

        // Proactively refresh token if expired or about to expire (<60s)
        if (activeSession?.expires_at) {
          const nowSec = Math.floor(Date.now() / 1000);
          const secondsLeft = activeSession.expires_at - nowSec;
          if (secondsLeft < 60) {
            try {
              const { data, error } = await supabase.auth.refreshSession();
              if (!error && data.session) {
                activeSession = data.session;
              } else if (error) {
                // Refresh failed — sign out cleanly
                await supabase.auth.signOut();
                activeSession = null;
              }
            } catch (e) {
              console.error('Proactive refresh failed:', e);
            }
          }
        }

        if (!isMounted) return;
        setSession(activeSession);
        setUser(activeSession?.user ?? null);

        if (activeSession?.user) {
          await fetchUserData(activeSession.user.id, true);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData, queryClient]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
    inFlightFetchRef.current = null;
    lastFetchRef.current = null;
    resetQueryLoopGuard();
    queryClient.clear();
  };

  const isAdmin = role === 'superadmin' || role === 'admin' || role === 'accounting';

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, signIn, signOut, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
