import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

  const inFlightFetchRef = useRef<Promise<void> | null>(null);
  const lastFetchRef = useRef<{ userId: string; at: number } | null>(null);

  const fetchUserData = useCallback(async (userId: string, force = false) => {
    const now = Date.now();
    const lastFetch = lastFetchRef.current;

    if (!force && lastFetch?.userId === userId && now - lastFetch.at < 1500) {
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
      (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

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
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserData(session.user.id, true);
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
  }, [fetchUserData]);

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
  };

  const isAdmin = role === 'superadmin' || role === 'admin' || role === 'accounting';

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, signIn, signOut, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
