'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserProfile } from '@/types';
import { createClient, isSupabaseConfigured } from './supabase/client';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  role: 'student' | 'admin';
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password?: string) => Promise<{ error?: string }>;
  signUp: (email: string, password?: string, displayName?: string) => Promise<{ error?: string; requiresEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error?: string }>;
  switchDemoRole: (role: 'student' | 'admin') => void;
  loginAsDemo: (role?: 'student' | 'admin') => void;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
}

const DEFAULT_DEMO_USER: AuthUser = {
  id: 'usr-student-demo-01',
  email: 'student.demo@iitm.ac.in',
  display_name: 'Aarav Sharma',
  role: 'student',
};

const DEFAULT_DEMO_PROFILE: UserProfile = {
  id: 'usr-student-demo-01',
  display_name: 'Aarav Sharma',
  email: 'student.demo@iitm.ac.in',
  college: 'National Institute of Technology Karnataka (NITK Surathkal)',
  degree: 'B.Tech in Computer Science and Engineering',
  academic_year: '3rd Year',
  academic_background: 'Computer Science and IT',
  primary_interest: 'Artificial Intelligence & Systems',
  secondary_interests: ['Open Source', 'Data Science', 'Quantum Computing'],
  skills: ['Python', 'C++', 'Data Structures', 'Git', 'PyTorch', 'SQL'],
  career_goals: 'Pursue advanced research in AI and secure a prestigious research fellowship at an IIT or IISc.',
  preferred_format: 'Any',
  preferred_locations: ['Bengaluru', 'Chennai', 'Mumbai', 'New Delhi'],
  min_stipend_preference: 5000,
  duration_preference: '2 Months (Summer)',
  role: 'student',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    async function initAuth() {
      if (isConfigured) {
        const supabase = createClient();
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            const role = (userProfile?.role as 'student' | 'admin') || 'student';
            const authUser: AuthUser = {
              id: session.user.id,
              email: session.user.email || '',
              display_name: userProfile?.display_name || session.user.user_metadata?.display_name || 'Student User',
              role,
            };
            setUser(authUser);
            setProfile(userProfile || null);
          }
        }
      } else {
        // Safe demo session lifecycle:
        // Clear any legacy demo keys from localStorage so a fresh browser session is never auto-logged in.
        // Demo sessions are held strictly in sessionStorage (tab/window session duration).
        try {
          localStorage.removeItem('internpath_demo_user');
          localStorage.removeItem('internpath_demo_profile');
        } catch {
          // Ignore localStorage errors
        }

        let storedUser: string | null = null;
        let storedProfile: string | null = null;
        try {
          storedUser = sessionStorage.getItem('internpath_demo_user');
          storedProfile = sessionStorage.getItem('internpath_demo_profile');
        } catch {
          // Ignore sessionStorage errors
        }

        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }

        if (storedProfile) {
          try {
            setProfile(JSON.parse(storedProfile));
          } catch {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      }
      setLoading(false);
    }

    initAuth();
  }, [isConfigured]);

  const signIn = async (email: string, password?: string): Promise<{ error?: string }> => {
    setLoading(true);
    if (isConfigured) {
      const supabase = createClient();
      if (!supabase) return { error: 'Supabase client not available' };
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password || '',
      });
      if (error) {
        setLoading(false);
        return { error: error.message };
      }
      if (data.user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const role = (userProfile?.role as 'student' | 'admin') || 'student';
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || email,
          display_name: userProfile?.display_name || 'Student User',
          role,
        };
        setUser(authUser);
        setProfile(userProfile);
      }
      setLoading(false);
      return {};
    } else {
      // Demo authentication simulation
      const isAdmin = email.toLowerCase().includes('admin');
      const authUser: AuthUser = {
        id: isAdmin ? 'usr-admin-demo-99' : 'usr-student-demo-01',
        email,
        display_name: isAdmin ? 'Admin Evaluator' : (email.split('@')[0] || 'Aarav Sharma'),
        role: isAdmin ? 'admin' : 'student',
      };
      const userProf: UserProfile = {
        ...DEFAULT_DEMO_PROFILE,
        id: authUser.id,
        email,
        display_name: authUser.display_name,
        role: authUser.role,
      };
      setUser(authUser);
      setProfile(userProf);
      sessionStorage.setItem('internpath_demo_user', JSON.stringify(authUser));
      sessionStorage.setItem('internpath_demo_profile', JSON.stringify(userProf));
      setLoading(false);
      return {};
    }
  };

  const signUp = async (
    email: string,
    password?: string,
    displayName?: string
  ): Promise<{ error?: string; requiresEmailConfirmation?: boolean }> => {
    setLoading(true);
    if (isConfigured) {
      const supabase = createClient();
      if (!supabase) return { error: 'Supabase client not available' };
      const { data, error } = await supabase.auth.signUp({
        email,
        password: password || '',
        options: {
          data: { display_name: displayName || email.split('@')[0] },
        },
      });
      if (error) {
        setLoading(false);
        return { error: error.message };
      }
      if (data.user && !data.session) {
        setLoading(false);
        return { requiresEmailConfirmation: true };
      }
      if (data.user) {
        const newProfile: UserProfile = {
          id: data.user.id,
          email,
          display_name: displayName || email.split('@')[0],
          academic_background: 'Engineering and Technology',
          primary_interest: 'General',
          secondary_interests: [],
          skills: [],
          preferred_format: 'Any',
          preferred_locations: [],
          role: 'student',
        };
        await supabase.from('profiles').insert(newProfile);
        setUser({
          id: data.user.id,
          email,
          display_name: newProfile.display_name,
          role: 'student',
        });
        setProfile(newProfile);
      }
      setLoading(false);
      return {};
    } else {
      // Demo mode sign up
      const authUser: AuthUser = {
        id: 'usr-' + Date.now(),
        email,
        display_name: displayName || email.split('@')[0],
        role: 'student',
      };
      const newProf: UserProfile = {
        ...DEFAULT_DEMO_PROFILE,
        id: authUser.id,
        email,
        display_name: authUser.display_name,
        role: 'student',
      };
      setUser(authUser);
      setProfile(newProf);
      sessionStorage.setItem('internpath_demo_user', JSON.stringify(authUser));
      sessionStorage.setItem('internpath_demo_profile', JSON.stringify(newProf));
      setLoading(false);
      return {};
    }
  };

  const signOut = async () => {
    if (isConfigured) {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    }
    // Safely clear only demo session keys, preserving saved internships and application data
    try {
      sessionStorage.removeItem('internpath_demo_user');
      sessionStorage.removeItem('internpath_demo_profile');
      localStorage.removeItem('internpath_demo_user');
      localStorage.removeItem('internpath_demo_profile');
    } catch {
      // Ignore storage cleanup issues in sandbox
    }
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<{ error?: string }> => {
    if (!user || !profile) return { error: 'Not authenticated' };
    const updated = { ...profile, ...data, updated_at: new Date().toISOString() };
    if (isConfigured) {
      const supabase = createClient();
      if (supabase) {
        const { error } = await supabase.from('profiles').upsert(updated);
        if (error) return { error: error.message };
      }
    } else {
      sessionStorage.setItem('internpath_demo_profile', JSON.stringify(updated));
    }
    setProfile(updated);
    if (data.display_name && data.display_name !== user.display_name) {
      const updatedUser = { ...user, display_name: data.display_name };
      setUser(updatedUser);
      if (!isConfigured) {
        sessionStorage.setItem('internpath_demo_user', JSON.stringify(updatedUser));
      }
    }
    return {};
  };

  const switchDemoRole = (newRole: 'student' | 'admin') => {
    if (!user) return;
    if (isConfigured) return; // Strict security: never allow demo role switching in production Supabase mode
    const updatedUser: AuthUser = { ...user, role: newRole };
    const updatedProfile: UserProfile = profile
      ? { ...profile, role: newRole }
      : { ...DEFAULT_DEMO_PROFILE, role: newRole };
    setUser(updatedUser);
    setProfile(updatedProfile);
    sessionStorage.setItem('internpath_demo_user', JSON.stringify(updatedUser));
    sessionStorage.setItem('internpath_demo_profile', JSON.stringify(updatedProfile));
  };

  const loginAsDemo = (role: 'student' | 'admin' = 'student') => {
    const isAdm = role === 'admin';
    const authUser: AuthUser = isAdm
      ? {
          id: 'usr-admin-demo-99',
          email: 'admin.evaluator@internpath.in',
          display_name: 'Admin Evaluator',
          role: 'admin',
        }
      : DEFAULT_DEMO_USER;
    const userProf: UserProfile = isAdm
      ? {
          ...DEFAULT_DEMO_PROFILE,
          id: authUser.id,
          email: authUser.email,
          display_name: authUser.display_name,
          role: 'admin',
        }
      : DEFAULT_DEMO_PROFILE;

    setUser(authUser);
    setProfile(userProf);
    if (!isConfigured) {
      sessionStorage.setItem('internpath_demo_user', JSON.stringify(authUser));
      sessionStorage.setItem('internpath_demo_profile', JSON.stringify(userProf));
    }
  };

  const resetPassword = async (email: string): Promise<{ error?: string; message?: string }> => {
    if (isConfigured) {
      const supabase = createClient();
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) return { error: error.message };
        return { message: 'Password reset link sent to your registered email address.' };
      }
    }
    return { message: 'Demo Mode: In a production environment, an official reset link is sent to ' + email };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isConfigured,
        signIn,
        signUp,
        signOut,
        updateProfile,
        switchDemoRole,
        loginAsDemo,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
