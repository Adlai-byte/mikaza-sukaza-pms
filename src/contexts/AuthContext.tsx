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
  user_type: 'admin' | 'ops' | 'provider' | 'customer';
  is_active: boolean;
  photo_url?: string | null;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
  account_status?: 'active' | 'suspended' | 'archived';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isOps: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; data?: any }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.user_type === 'admin';
  const isOps = profile?.user_type === 'ops';

  const fetchProfile = async (userId: string) => {
    try {
      console.log('📥 Fetching profile for user:', userId);

      // Try to get user data from users table (main source of truth)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userError) {
        console.error('❌ Error fetching user data:', userError);
        setLoading(false);
        return;
      }

      if (userData) {
        console.log('✅ Profile loaded:', userData.email, userData.user_type);

        const profileData: Profile = {
          id: userId,
          user_id: userId,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          user_type: userData.user_type,
          is_active: userData.is_active ?? true,
          photo_url: userData.photo_url,
          created_at: userData.created_at,
          updated_at: userData.updated_at,
        };

        setProfile(profileData);
        setLoading(false);
      } else {
        console.warn('⚠️ No user data found for:', userId);
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch profile data when user logs in
          fetchProfile(session.user.id);

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
          setLoading(false);
        }
      }
    );

    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 Checking for existing session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔑 [AuthContext] Sign in started:', {
      email,
      timestamp: new Date().toISOString()
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ [AuthContext] Sign in failed:', {
        email,
        error: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('✅ [AuthContext] Sign in successful:', {
        email,
        userId: data?.user?.id,
        emailVerified: !!data?.user?.email_confirmed_at,
        timestamp: new Date().toISOString()
      });
    }

    // Track last login timestamp
    if (data?.user && !error) {
      const now = new Date().toISOString();

      console.log('⏰ [AuthContext] Updating last_login_at:', {
        userId: data.user.id,
        email,
        timestamp: now
      });

      // Update both users and profiles tables
      await Promise.all([
        supabase
          .from('users')
          .update({ last_login_at: now })
          .eq('user_id', data.user.id),
        supabase
          .from('profiles')
          .update({ last_login_at: now })
          .eq('id', data.user.id)
      ]).catch(err => {
        console.warn('⚠️ [AuthContext] Failed to update last_login_at:', err);
      });
    }

    return { data, error };
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    console.log('📝 [AuthContext] Sign up started:', {
      email,
      firstName,
      lastName,
      timestamp: new Date().toISOString()
    });

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

    if (error) {
      console.error('❌ [AuthContext] Sign up failed:', {
        email,
        error: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('✅ [AuthContext] Sign up successful:', {
        email,
        timestamp: new Date().toISOString()
      });
    }

    return { error };
  };

  const signOut = async () => {
    try {
      console.log('🚪 [AuthContext] Signing out user:', {
        email: user?.email,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });

      // Clear local state immediately
      setProfile(null);
      setUser(null);
      setSession(null);

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ [AuthContext] Supabase signOut error:', {
          error: error.message,
          errorCode: error.code,
          timestamp: new Date().toISOString()
        });
        throw error;
      }

      console.log('✅ [AuthContext] Successfully signed out:', {
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [AuthContext] Error during sign out:', error);
      // Clear state anyway even if supabase signout fails
      setProfile(null);
      setUser(null);
      setSession(null);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      console.warn('⚠️ [AuthContext] Update profile attempted without user');
      return;
    }

    console.log('🔄 [AuthContext] Updating profile:', {
      userId: user.id,
      email: user.email,
      updates: Object.keys(updates),
      timestamp: new Date().toISOString()
    });

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('❌ [AuthContext] Profile update failed:', {
        userId: user.id,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }

    console.log('✅ [AuthContext] Profile updated successfully:', {
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    // Refresh profile data
    await fetchProfile(user.id);
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isAdmin,
    isOps,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
