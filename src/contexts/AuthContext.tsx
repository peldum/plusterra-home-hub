import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
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
  const lastAccessTokenRef = useRef<string | null>(null);

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

        setRole(roleRes.data?.role ? (roleRes.data.role as AppRole) : null);
        setProfile(profileRes.data ?? null);
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

        const newUserId = newSession?.user?.id ?? null;
        const prevUserId = currentUserIdRef.current;
        const userChanged = newUserId !== prevUserId;

        // TOKEN_REFRESHED reuses the same user → skip ALL state updates and refetches.
        // This is the primary cause of the previous request loop.
        if (event === 'TOKEN_REFRESHED' && !userChanged) {
          // Only reset the loop guard if the access_token actually changed.
          // Supabase can emit TOKEN_REFRESHED repeatedly with the same token
          // (tab focus, multi-tab sync, etc.); resetting the guard on every
          // event allows queries to re-fire and produces the visible loop.
          const newToken = newSession?.access_token ?? null;
          if (newToken && newToken !== lastAccessTokenRef.current) {
            lastAccessTokenRef.current = newToken;
            resetQueryLoopGuard();
          }
          return;
        }

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setRole(null);
          setProfile(null);
          setLoading(false);
          inFlightFetchRef.current = null;
          lastFetchRef.current = null;
          currentUserIdRef.current = null;
          resetQueryLoopGuard();
          queryClient.clear();
          return;
        }

        // Only push new state when user identity actually changed.
        if (!userChanged) {
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);
        setRole(null);
        setProfile(null);
        setLoading(!!newSession?.user);
        currentUserIdRef.current = newUserId;
        lastAccessTokenRef.current = newSession?.access_token ?? null;

        if (!newSession?.user) {
          setRole(null);
          setProfile(null);
          inFlightFetchRef.current = null;
          lastFetchRef.current = null;
          setLoading(false);
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
        currentUserIdRef.current = activeSession?.user?.id ?? null;
        lastAccessTokenRef.current = activeSession?.access_token ?? null;

        if (activeSession?.user) {
          setRole(null);
          setProfile(null);
          setLoading(true);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        if (isMounted && !currentUserIdRef.current) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData, queryClient]);

  useEffect(() => {
    if (!user?.id) return;
    let isActive = true;

    setLoading(true);
    void fetchUserData(user.id, true).finally(() => {
      if (isActive && currentUserIdRef.current === user.id) setLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [user?.id, fetchUserData]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
    setLoading(false);
    inFlightFetchRef.current = null;
    lastFetchRef.current = null;
    currentUserIdRef.current = null;
    resetQueryLoopGuard();
    queryClient.clear();
  }, [queryClient]);

  const isAdmin = role === 'superadmin' || role === 'admin' || role === 'accounting';
  const contextValue = useMemo(
    () => ({ user, session, role, profile, loading, signIn, signOut, isAdmin }),
    [user, session, role, profile, loading, signIn, signOut, isAdmin]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
