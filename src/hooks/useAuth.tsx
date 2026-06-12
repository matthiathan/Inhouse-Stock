// Renaming file to .tsx to support JSX
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: string | null;
  isAdmin: boolean;
  can_update_location: boolean;
  refreshProfile: () => Promise<void>;
  loginDemo: (roleName: 'admin' | 'user') => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  isAdmin: false,
  can_update_location: true,
  refreshProfile: async () => {},
  loginDemo: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [canUpdateLocation, setCanUpdateLocation] = useState<boolean>(true);

  const fetchProfile = async (userId: string, emailStr?: string) => {
    // Skip if it's a demo user id
    if (userId === 'demo-admin-id' || userId === 'demo-user-id') {
      setRole(userId === 'demo-admin-id' ? 'admin' : 'user');
      setCanUpdateLocation(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error.message);
        // If the profile does not exist (e.g. 40 row not found), let's attempt to insert the record.
        const defaultProfile = {
          id: userId,
          email: emailStr || '',
          role: 'user',
          can_update_location: true
        };
        const { data: inserted, error: insertError } = await supabase
          .from('users')
          .insert([defaultProfile])
          .select()
          .single();

        if (!insertError && inserted) {
          setRole(inserted.role || 'user');
          setCanUpdateLocation(inserted.can_update_location !== false);
        } else {
          setRole('user');
          setCanUpdateLocation(true);
        }
      } else if (data) {
        setRole(data.role || 'user');
        setCanUpdateLocation(data.can_update_location !== false);
      }
    } catch (err) {
      console.error('Profile fetch unexpected error:', err);
      setRole('user');
      setCanUpdateLocation(true);
    }
  };

  const loginDemo = (roleName: 'admin' | 'user') => {
    localStorage.setItem('demo_user_role', roleName);
    setRole(roleName);
    setCanUpdateLocation(true);
    const demoId = roleName === 'admin' ? 'demo-admin-id' : 'demo-user-id';
    const mockUser = {
      id: demoId,
      email: `${roleName}@demo.local`,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString()
    } as any;
    setUser(mockUser);
    setSession({
      access_token: 'demo-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'demo-refresh',
      user: mockUser
    });
  };

  useEffect(() => {
    let active = true;

    const handleSessionChange = async (currentSession: Session | null) => {
      if (!active) return;
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        if (currentUser.id === "demo-admin-id" || currentUser.id === "demo-user-id") {
          setRole(currentUser.id === "demo-admin-id" ? "admin" : "user");
          setCanUpdateLocation(true);
        } else {
          await fetchProfile(currentUser.id, currentUser.email);
        }
      } else {
        // Check for local demo login fallback
        const savedDemo = localStorage.getItem('demo_user_role');
        if (savedDemo === 'admin' || savedDemo === 'user') {
          const demoRole = savedDemo as 'admin' | 'user';
          setRole(demoRole);
          setCanUpdateLocation(true);
          const demoId = demoRole === 'admin' ? 'demo-admin-id' : 'demo-user-id';
          const mockUser = {
            id: demoId,
            email: `${demoRole}@demo.local`,
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString()
          } as any;
          setUser(mockUser);
          setSession({
            access_token: 'demo-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'demo-refresh',
            user: mockUser
          });
        } else {
          setRole(null);
          setCanUpdateLocation(true);
        }
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
    <AuthContext.Provider value={{ user, session, loading, role, isAdmin: role === 'admin', can_update_location: canUpdateLocation, refreshProfile, loginDemo }}>
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
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const logout = async () => {
    localStorage.removeItem('demo_user_role');
    context.loginDemo = () => {}; // dummy
    // Since we are resetting state, try doing it as much as possible synchronously first
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Signout error caught:", err);
    }
    // Hard refresh is extremely safe clean state recovery for demo mode logs
    window.location.reload();
    return { error: null };
  };

  return { ...context, isAdmin: context.role === 'admin', login, logout };
};
