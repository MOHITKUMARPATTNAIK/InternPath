'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { UserProfile, UserRole } from '@/types';
import {
  createClient,
  getSupabaseDiagnostics,
  isDemoModeAllowed,
  SupabaseDiagnostics,
} from './supabase/client';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
}

export interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  configStatus: SupabaseDiagnostics;
  signIn: (email: string, password?: string) => Promise<{ error?: string }>;
  signUp: (email: string, password?: string, displayName?: string) => Promise<{ error?: string; requiresEmailConfirmation?: boolean }>;
  signOut: () => Promise<{ error?: string }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error?: string }>;
  switchDemoRole: (role: 'student' | 'admin') => { error?: string };
  loginAsDemo: (role?: 'student' | 'admin') => { error?: string };
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
  const configStatus = getSupabaseDiagnostics();
  const isConfigured = configStatus.configured;
  const isLoggingOutRef = useRef<boolean>(false);

  useEffect(() => {
    let authListenerSubscription: { unsubscribe: () => void } | null = null;

    const syncUserProfile = async (
      supabaseClient: NonNullable<ReturnType<typeof createClient>>,
      authUserObj: { id: string; email?: string; user_metadata?: Record<string, any> }
    ) => {
      const { data: userProfile, error: profileErr } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', authUserObj.id)
        .maybeSingle();

      if (profileErr) {
        console.warn('Profile retrieval notice:', profileErr.message);
      }

      const role = (userProfile?.role as UserRole) || 'student';
      const fallbackDisplayName =
        authUserObj.user_metadata?.display_name ||
        authUserObj.email?.split('@')[0] ||
        'Student User';

      const authUser: AuthUser = {
        id: authUserObj.id,
        email: authUserObj.email || '',
        display_name: userProfile?.display_name || fallbackDisplayName,
        role,
      };

      const resolvedProfile: UserProfile = userProfile || {
        id: authUserObj.id,
        email: authUserObj.email || '',
        display_name: fallbackDisplayName,
        academic_background: 'Engineering and Technology',
        primary_interest: 'General',
        secondary_interests: [],
        skills: [],
        preferred_format: 'Any',
        preferred_locations: [],
        role: 'student',
      };

      setUser(authUser);
      setProfile(resolvedProfile);
    };

    async function initAuth() {
      setLoading(true);
      try {
        if (isConfigured) {
          // In real Supabase mode, purge any legacy demo session artifacts
          try {
            sessionStorage.removeItem('internpath_demo_user');
            sessionStorage.removeItem('internpath_demo_profile');
            localStorage.removeItem('internpath_demo_user');
            localStorage.removeItem('internpath_demo_profile');
          } catch {
            // Ignore storage cleanup issues
          }

          const supabase = createClient();
          if (supabase) {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session?.user) {
              setUser(null);
              setProfile(null);
            } else {
              await syncUserProfile(supabase, session.user);
            }

            const { data: { subscription } } = supabase.auth.onAuthStateChange(
              async (event, newSession) => {
                if (event === 'SIGNED_OUT' || !newSession?.user) {
                  setUser(null);
                  setProfile(null);
                } else if (newSession?.user) {
                  await syncUserProfile(supabase, newSession.user);
                }
              }
            );
            authListenerSubscription = subscription;
          } else {
            setUser(null);
            setProfile(null);
          }
        } else {
          // Supabase is not configured
          // Check if development-only demo mode is explicitly enabled
          if (isDemoModeAllowed()) {
            let storedUser: string | null = null;
            let storedProfile: string | null = null;
            try {
              storedUser = sessionStorage.getItem('internpath_demo_user');
              storedProfile = sessionStorage.getItem('internpath_demo_profile');
            } catch {
              // Ignore storage errors
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
          } else {
            // Demo mode is not enabled: strictly ensure user is unauthenticated
            try {
              sessionStorage.removeItem('internpath_demo_user');
              sessionStorage.removeItem('internpath_demo_profile');
              localStorage.removeItem('internpath_demo_user');
              localStorage.removeItem('internpath_demo_profile');
            } catch {
              // Ignore storage cleanup issues
            }
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    return () => {
      authListenerSubscription?.unsubscribe();
    };
  }, [isConfigured]);

  const signIn = async (email: string, password?: string): Promise<{ error?: string }> => {
    setLoading(true);

    // Rule: Real authentication requires a configured Supabase backend.
    // A failed real login or missing database connection must NEVER fabricate a fake account.
    if (!isConfigured) {
      setLoading(false);
      const err =
        configStatus.helpMessage ||
        'Authentication is unavailable because Supabase is not configured in .env.local. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) and restart the dev server.';
      return { error: err };
    }

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return { error: 'Unable to initialize Supabase client. Please check your configuration.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password || '',
      });

      if (error) {
        setLoading(false);
        const lowerMsg = (error.message || '').toLowerCase();
        // Generic error message for bad credentials to prevent email enumeration
        if (
          lowerMsg.includes('invalid login credentials') ||
          lowerMsg.includes('invalid credentials') ||
          lowerMsg.includes('user not found') ||
          lowerMsg.includes('wrong password')
        ) {
          return { error: 'Invalid email or password. Please verify your credentials and try again.' };
        }
        if (lowerMsg.includes('email not confirmed')) {
          return { error: 'Your email address is not verified yet. Please check your inbox for the confirmation link.' };
        }
        if (lowerMsg.includes('fetch') || lowerMsg.includes('network') || lowerMsg.includes('connection')) {
          return { error: 'Unable to connect to the authentication service. Please check your network connection.' };
        }
        return { error: error.message || 'Invalid email or password.' };
      }

      // Check that both session and user are present and valid
      if (!data.session || !data.user) {
        setLoading(false);
        return { error: 'Authentication could not establish a valid session. Please verify your email or credentials.' };
      }

      // Successful Supabase credential authentication
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const role = (userProfile?.role as UserRole) || 'student';
      const fallbackDisplayName =
        data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'Student User';

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || email.trim(),
        display_name: userProfile?.display_name || fallbackDisplayName,
        role,
      };

      const resolvedProfile: UserProfile = userProfile || {
        id: data.user.id,
        email: data.user.email || email.trim(),
        display_name: fallbackDisplayName,
        academic_background: 'Engineering and Technology',
        primary_interest: 'General',
        secondary_interests: [],
        skills: [],
        preferred_format: 'Any',
        preferred_locations: [],
        role: 'student',
      };

      setUser(authUser);
      setProfile(resolvedProfile);
      setLoading(false);
      return {};
    } catch (networkOrUnknownError: any) {
      setLoading(false);
      console.error('Sign-in network or service exception:', networkOrUnknownError);
      return {
        error: 'Unable to communicate with the authentication server. Please check your connection and try again.',
      };
    }
  };

  const signUp = async (
    email: string,
    password?: string,
    displayName?: string
  ): Promise<{ error?: string; requiresEmailConfirmation?: boolean }> => {
    setLoading(true);

    // Rule: Real registration requires a configured Supabase backend.
    // Missing configuration must NEVER fabricate a fake account.
    if (!isConfigured) {
      setLoading(false);
      const err =
        configStatus.helpMessage ||
        'Account registration is unavailable because Supabase is not configured in .env.local. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) and restart the dev server.';
      return { error: err };
    }

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return { error: 'Unable to initialize Supabase client. Please check your configuration.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password || '',
        options: {
          data: { display_name: displayName || email.trim().split('@')[0] },
          emailRedirectTo:
            typeof window !== 'undefined'
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });

      if (error) {
        setLoading(false);
        const lowerMsg = (error.message || '').toLowerCase();
        if (lowerMsg.includes('user already registered')) {
          return { error: 'An account with this email address already exists. Please sign in instead.' };
        }
        return { error: error.message };
      }

      if (data.user && !data.session) {
        setLoading(false);
        return { requiresEmailConfirmation: true };
      }

      if (data.user && data.session) {
        const newProfile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email.trim(),
          display_name: displayName || email.trim().split('@')[0],
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
          email: data.user.email || email.trim(),
          display_name: newProfile.display_name,
          role: 'student',
        });
        setProfile(newProfile);
        setLoading(false);
        return {};
      }

      setLoading(false);
      return { error: 'Account creation could not be completed. Please try again.' };
    } catch (networkOrUnknownError: any) {
      setLoading(false);
      console.error('Sign-up network or service exception:', networkOrUnknownError);
      return {
        error: 'Unable to connect to the registration service. Please check your connection and try again.',
      };
    }
  };

  const signOut = async (): Promise<{ error?: string }> => {
    // Prevent duplicate logout requests and race conditions
    if (isLoggingOutRef.current) {
      return {};
    }
    isLoggingOutRef.current = true;

    try {
      let signoutError: string | undefined;

      if (isConfigured) {
        const supabase = createClient();
        if (supabase) {
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error('Supabase signOut error:', error.message);
            signoutError = error.message;
          }
        }
      }

      // Safely clear demo session keys, strictly preserving saved internships and application data
      try {
        sessionStorage.removeItem('internpath_demo_user');
        sessionStorage.removeItem('internpath_demo_profile');
        localStorage.removeItem('internpath_demo_user');
        localStorage.removeItem('internpath_demo_profile');
      } catch {
        // Ignore storage cleanup issues in sandboxed browsers
      }

      // Immediately clear in-memory user and profile state to prevent stale data display
      setUser(null);
      setProfile(null);

      if (signoutError) {
        return { error: signoutError };
      }
      return {};
    } finally {
      isLoggingOutRef.current = false;
    }
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<{ error?: string }> => {
    if (!user || !profile) return { error: 'Not authenticated' };

    // Strip protected fields: never accept an admin role or modified ID from client-submitted data
    const safeData = { ...data };
    delete (safeData as any).role;
    delete (safeData as any).id;

    const updated = { ...profile, ...safeData, updated_at: new Date().toISOString() };
    if (isConfigured) {
      const supabase = createClient();
      if (supabase) {
        const { error } = await supabase.from('profiles').upsert(updated);
        if (error) return { error: error.message };
      }
    } else if (isDemoModeAllowed()) {
      sessionStorage.setItem('internpath_demo_profile', JSON.stringify(updated));
    }

    setProfile(updated);
    if (safeData.display_name && safeData.display_name !== user.display_name) {
      const updatedUser = { ...user, display_name: safeData.display_name };
      setUser(updatedUser);
      if (!isConfigured && isDemoModeAllowed()) {
        sessionStorage.setItem('internpath_demo_user', JSON.stringify(updatedUser));
      }
    }
    return {};
  };

  const switchDemoRole = (newRole: 'student' | 'admin'): { error?: string } => {
    if (!isDemoModeAllowed()) {
      return { error: 'Demo role switching is forbidden in production or configured environments.' };
    }
    if (!user) return { error: 'No active demo session to switch.' };
    const updatedUser: AuthUser = { ...user, role: newRole };
    const updatedProfile: UserProfile = profile
      ? { ...profile, role: newRole }
      : { ...DEFAULT_DEMO_PROFILE, role: newRole };
    setUser(updatedUser);
    setProfile(updatedProfile);
    try {
      sessionStorage.setItem('internpath_demo_user', JSON.stringify(updatedUser));
      sessionStorage.setItem('internpath_demo_profile', JSON.stringify(updatedProfile));
    } catch {}
    return {};
  };

  const loginAsDemo = (role: 'student' | 'admin' = 'student'): { error?: string } => {
    if (!isDemoModeAllowed()) {
      if (process.env.NODE_ENV === 'production') {
        const msg = 'Security violation: Demo mode is strictly disabled in production builds.';
        console.warn(msg);
        return { error: msg };
      }
      if (isConfigured) {
        const msg = 'Demo mode is disabled when a real Supabase database is connected.';
        console.warn(msg);
        return { error: msg };
      }
      const msg =
        'Demo mode is disabled. To enable it for local development, set NEXT_PUBLIC_ENABLE_DEMO_MODE=true in .env.local and restart the server.';
      console.warn(msg);
      return { error: msg };
    }

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
    try {
      sessionStorage.setItem('internpath_demo_user', JSON.stringify(authUser));
      sessionStorage.setItem('internpath_demo_profile', JSON.stringify(userProf));
    } catch {}
    return {};
  };

  const resetPassword = async (email: string): Promise<{ error?: string; message?: string }> => {
    if (isConfigured) {
      const supabase = createClient();
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo:
            typeof window !== 'undefined'
              ? `${window.location.origin}/auth/callback?next=/auth/reset-password`
              : undefined,
        });
        if (error) return { error: error.message };
        return { message: 'Password reset link sent to your registered email address.' };
      }
    }
    return {
      error:
        configStatus.helpMessage ||
        'Password reset is unavailable because Supabase is not configured in .env.local.',
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isConfigured,
        configStatus,
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
