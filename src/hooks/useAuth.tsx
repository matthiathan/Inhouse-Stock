// Renaming file to .tsx to support JSX
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: string | null;
  isAdmin: boolean;
  can_update_location: boolean;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  isAdmin: false,
  can_update_location: true,
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [canUpdateLocation, setCanUpdateLocation] = useState<boolean>(true);

  const fetchProfile = async (userId: string, emailStr?: string) => {
    try {
      // First, get any role defined in user metadata or app metadata as a fallback/source
      const currentUser = (await supabase.auth.getUser()).data.user;
      const metadataRole = currentUser?.app_metadata?.role || currentUser?.user_metadata?.role;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error.message);
        // If the profile does not exist (e.g. 40 row not found), let's attempt to insert the record with role from metadata
        const defaultProfile = {
          id: userId,
          email: emailStr || '',
          role: metadataRole || 'user',
          can_update_location: true
        };
        const { data: inserted, error: insertError } = await supabase
          .from('users')
          .insert([defaultProfile])
          .select()
          .single();

        if (!insertError && inserted) {
          setRole(inserted.role || metadataRole || 'user');
          setCanUpdateLocation(inserted.can_update_location !== false);
        } else {
          setRole(metadataRole || 'user');
          setCanUpdateLocation(true);
        }
      } else if (data) {
        setRole(data.role || metadataRole || 'user');
        setCanUpdateLocation(data.can_update_location !== false);
      }
    } catch (err) {
      console.error('Profile fetch unexpected error:', err);
      setRole('user');
      setCanUpdateLocation(true);
    }
  };

  useEffect(() => {
    if (!isConfigured) {
      const demoRole = localStorage.getItem('demo_user_role');
      if (demoRole) {
        setUser({
          id: 'demo-user',
          email: localStorage.getItem('demo_user_email') || 'operations@dallmayr.co.za',
          app_metadata: { role: demoRole },
          user_metadata: { role: demoRole },
          aud: 'authenticated',
          created_at: new Date().toISOString()
        } as User);
        setRole(demoRole);
        setCanUpdateLocation(true);
      }
      setLoading(false);
      return;
    }
    let active = true;

    const handleSessionChange = async (currentSession: Session | null) => {
      if (!active) return;
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id, currentUser.email);
      } else {
        setRole(null);
        setCanUpdateLocation(true);
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSessionChange(session);
    }).catch((err) => {
      console.warn('Initial session fetch error:', err.message);
      handleSessionChange(null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await handleSessionChange(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, isAdmin: role === 'admin', can_update_location: canUpdateLocation, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  const login = async (email: string, password: string) => {
    if (!isConfigured) {
      localStorage.setItem('demo_user_role', 'admin');
      localStorage.setItem('demo_user_email', email || 'operations@dallmayr.co.za');
      window.location.href = '/';
      return { error: null, data: null };
    }
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const logout = async () => {
    if (!isConfigured) {
      localStorage.removeItem('demo_user_role');
      localStorage.removeItem('demo_user_email');
      window.location.href = '/login';
      return { error: null };
    }
    // Since we are resetting state, try doing it as much as possible synchronously first
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Signout error caught:", err);
    }
    // Hard refresh is extremely safe clean state recovery
    window.location.reload();
    return { error: null };
  };

  const userRole = context.role;

  return {
    ...context,
    isAdmin: userRole === 'admin',
    isOpsManager: userRole === 'ops_manager',
    isWarehouse: userRole === 'warehouse',
    isFinance: userRole === 'finance',
    isTech: userRole === 'tech' || userRole === 'road_tech',
    isUser: userRole === 'user',
    login,
    logout
  };
};
