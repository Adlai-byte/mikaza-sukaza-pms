import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { cacheWarmer } from '@/lib/cache-manager-simplified';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  user_type: 'admin' | 'ops';
  is_active: boolean;
  photo_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isOps: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  sessionLogin: (userFromDB: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Toggle this to disable authentication temporarily
const AUTH_ENABLED = false; // Set to true to enable authentication, false for session-based login

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock user for when auth is disabled
  const mockProfile: Profile = {
    id: 'mock-user-id',
    user_id: 'mock-user-id',
    email: 'admin@example.com',
    first_name: 'Admin',
    last_name: 'User',
    user_type: 'admin',
    is_active: true,
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const isAdmin = profile?.user_type === 'admin';
  const isOps = profile?.user_type === 'ops';

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data as Profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    if (!AUTH_ENABLED) {
      const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

      // Check if session is still valid based on inactivity
      const checkSessionValidity = () => {
        const storedUser = localStorage.getItem('tempSessionUser');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            const lastActivity = userData.lastActivityAt || new Date().getTime();
            const now = new Date().getTime();
            const inactiveTime = now - lastActivity;

            if (inactiveTime > INACTIVITY_TIMEOUT) {
              console.log('⏰ Session expired due to inactivity (10 minutes)');
              localStorage.removeItem('tempSessionUser');
              setProfile(null);
              window.location.href = '/auth';
              return false;
            }
            return true;
          } catch (error) {
            console.error('Error checking session validity:', error);
            return false;
          }
        }
        return false;
      };

      // Check if there's a stored session user and if it's still valid
      const storedUser = localStorage.getItem('tempSessionUser');
      if (storedUser) {
        if (checkSessionValidity()) {
          try {
            const userData = JSON.parse(storedUser);
            const sessionProfile: Profile = {
              id: userData.user_id,
              user_id: userData.user_id,
              email: userData.email,
              first_name: userData.first_name,
              last_name: userData.last_name,
              user_type: userData.user_type,
              is_active: userData.is_active,
              photo_url: userData.photo_url,
              created_at: userData.created_at,
              updated_at: userData.updated_at,
            };
            setProfile(sessionProfile);

            // Update activity timestamp on load
            updateLastActivity();
          } catch (error) {
            console.error('Error parsing stored user:', error);
            setProfile(mockProfile);
          }
        }
      } else {
        setProfile(null); // No session user
      }

      // Set up activity listeners
      const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
      const throttledUpdateActivity = (() => {
        let timeout: NodeJS.Timeout | null = null;
        return () => {
          if (!timeout) {
            timeout = setTimeout(() => {
              updateLastActivity();
              timeout = null;
            }, 30000); // Update at most once every 30 seconds
          }
        };
      })();

      activityEvents.forEach(event => {
        window.addEventListener(event, throttledUpdateActivity);
      });

      // Check inactivity every minute
      const inactivityCheckInterval = setInterval(() => {
        checkSessionValidity();
      }, 60000); // Check every 60 seconds

      // Add a global function to check session status (for debugging)
      (window as any).checkSessionStatus = () => {
        const storedUser = localStorage.getItem('tempSessionUser');
        if (!storedUser) {
          console.log('❌ No active session');
          return;
        }
        try {
          const userData = JSON.parse(storedUser);
          const lastActivity = userData.lastActivityAt || 0;
          const now = new Date().getTime();
          const inactiveTime = now - lastActivity;
          const remainingTime = INACTIVITY_TIMEOUT - inactiveTime;
          const remainingMinutes = Math.floor(remainingTime / 60000);
          const remainingSeconds = Math.floor((remainingTime % 60000) / 1000);

          console.log('🔐 Session Status:');
          console.log(`   User: ${userData.first_name} ${userData.last_name} (${userData.email})`);
          console.log(`   Last Activity: ${new Date(lastActivity).toLocaleString()}`);
          console.log(`   Inactive Time: ${Math.floor(inactiveTime / 60000)} min ${Math.floor((inactiveTime % 60000) / 1000)} sec`);
          console.log(`   Time Until Logout: ${remainingMinutes} min ${remainingSeconds} sec`);

          if (remainingTime <= 0) {
            console.log('⚠️ Session should have expired! Check will run within 1 minute.');
          }
        } catch (error) {
          console.error('Error checking session:', error);
        }
      };

      setLoading(false);

      // Cleanup
      return () => {
        activityEvents.forEach(event => {
          window.removeEventListener(event, throttledUpdateActivity);
        });
        clearInterval(inactivityCheckInterval);
        delete (window as any).checkSessionStatus;
      };
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch profile data when user logs in
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);

          // Warm cache with critical data after login
          if (event === 'SIGNED_IN' && cacheWarmer) {
            cacheWarmer.warmCriticalData({
              properties: async () => {
                const { data } = await supabase
                  .from('properties')
                  .select('*')
                  .order('created_at', { ascending: false });
                return data;
              },
              amenities: async () => {
                const { data } = await supabase.from('amenities').select('*');
                return data;
              },
              rules: async () => {
                const { data } = await supabase.from('rules').select('*');
                return data;
              },
            }).catch(error => {
              console.warn('⚠️ Cache warming failed:', error);
            });
          }
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!AUTH_ENABLED) {
      console.log('Mock login attempt with:', { email, password });
      // Mock validation - always succeed for any email/password
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    if (!AUTH_ENABLED) {
      return { error: null };
    }

    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    return { error };
  };

  const updateLastActivity = () => {
    if (!AUTH_ENABLED) {
      const storedUser = localStorage.getItem('tempSessionUser');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          userData.lastActivityAt = new Date().getTime();
          localStorage.setItem('tempSessionUser', JSON.stringify(userData));
        } catch (error) {
          console.error('Error updating activity timestamp:', error);
        }
      }
    }
  };

  const sessionLogin = async (userFromDB: any) => {
    if (!AUTH_ENABLED) {
      console.log('🔐 Starting session login for:', userFromDB.email);

      // Store user in localStorage for session-based login with activity tracking
      const sessionData = {
        ...userFromDB,
        lastActivityAt: new Date().getTime(),
      };

      localStorage.setItem('tempSessionUser', JSON.stringify(sessionData));
      console.log('💾 Session data stored in localStorage');

      const sessionProfile: Profile = {
        id: userFromDB.user_id,
        user_id: userFromDB.user_id,
        email: userFromDB.email,
        first_name: userFromDB.first_name,
        last_name: userFromDB.last_name,
        user_type: userFromDB.user_type,
        is_active: userFromDB.is_active,
        photo_url: userFromDB.photo_url,
        created_at: userFromDB.created_at,
        updated_at: userFromDB.updated_at,
      };

      console.log('👤 Setting profile state:', sessionProfile);
      setProfile(sessionProfile);
      console.log('✅ Profile state updated - session login complete');

      // Warm cache with critical data after login
      if (cacheWarmer) {
        cacheWarmer.warmCriticalData({
          properties: async () => {
            const { data } = await supabase
              .from('properties')
              .select('*')
              .order('created_at', { ascending: false });
            return data;
          },
          amenities: async () => {
            const { data } = await supabase.from('amenities').select('*');
            return data;
          },
          rules: async () => {
            const { data } = await supabase.from('rules').select('*');
            return data;
          },
        }).catch(error => {
          console.warn('⚠️ Cache warming failed:', error);
        });
      }
    }
  };

  const signOut = async () => {
    if (!AUTH_ENABLED) {
      // Clear session storage and redirect to login page
      localStorage.removeItem('tempSessionUser');
      setProfile(null);
      window.location.href = '/auth';
      return;
    }

    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!AUTH_ENABLED) {
      // For disabled auth mode, update the mock profile
      setProfile(current => current ? { ...current, ...updates } : current);
      return;
    }

    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    // Refresh profile data
    await fetchProfile(user.id);
  };

  const value = {
    user: AUTH_ENABLED ? user : (profile ? { id: profile.user_id } as User : null),
    session: AUTH_ENABLED ? session : (profile ? { user: { id: profile.user_id } } as Session : null),
    profile,
    loading,
    isAdmin,
    isOps,
    signIn,
    signUp,
    signOut,
    updateProfile,
    sessionLogin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}