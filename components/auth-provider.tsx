'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';

declare global {
  interface Window {
    AF?: (command: string, ...args: any[]) => void;
    ttq?: {
      track: (event: string, data?: Record<string, any>) => void;
      identify: (data: Record<string, any>) => void;
    };
  }
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'quarterly';
  status: 'active' | 'canceled' | 'expired' | 'trialing';
  current_period_start: string | null;
  current_period_end: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  subscription: Subscription | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSubscribed: boolean;
  isPro: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  subscription: null,
  isLoading: true,
  isAuthenticated: false,
  isSubscribed: false,
  isPro: false,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    const supabase = createClient();

    try {
      // Fetch profile and subscription in parallel
      // Use maybeSingle() to return null instead of error when no rows exist
      const [profileResult, subscriptionResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      // Profile might not exist yet (new user) - that's OK
      if (profileResult.error && profileResult.error.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileResult.error);
      } else if (profileResult.data) {
        setProfile(profileResult.data);
      }

      // Subscription might not exist (free user) - that's OK
      if (subscriptionResult.error && subscriptionResult.error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subscriptionResult.error);
      } else if (subscriptionResult.data) {
        setSubscription(subscriptionResult.data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      setUser(session.user);
      await fetchUserData(session.user.id);
    }
  }, [fetchUserData]);

  useEffect(() => {
    const supabase = createClient();

    const initializeAuth = async () => {
      try {
        // 1. Try client-side getSession (reads from cookies)
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          setIsLoading(false);
          fetchUserData(session.user.id);
          return;
        }

        // 2. Client-side cookies not readable — fall back to server API
        console.log('[AuthProvider] No client session, checking server...');
        try {
          const res = await fetch('/api/auth/session');
          const data = await res.json();
          if (data.user) {
            console.log('[AuthProvider] Server confirms user:', data.user.email);
            // Set user from server response (partial User object)
            setUser(data.user as User);
            await fetchUserData(data.user.id);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.error('[AuthProvider] Server session check failed:', err);
        }

        console.log('[AuthProvider] No session found');
        setIsLoading(false);
      } catch (error) {
        console.error('[AuthProvider] initializeAuth exception:', error);
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setIsLoading(false);
          fetchUserData(session.user.id);

          // Check if this is a new user (created within the last 60 seconds)
          const userCreatedAt = new Date(session.user.created_at).getTime();
          const now = Date.now();
          const isNewUser = now - userCreatedAt < 60000; // 60 seconds

          // Always identify users with tracking pixels
          if (typeof window !== 'undefined' && window.AF) {
            window.AF('pba', 'setCustomerUserId', session.user.id);
          }
          if (typeof window !== 'undefined' && window.ttq) {
            window.ttq.identify({
              external_id: session.user.id,
              email: session.user.email,
            });
          }

          // Only track registration events for NEW users
          if (isNewUser) {
            console.log('[Auth] New user detected, tracking registration events');

            // Track signup with AppsFlyer
            if (typeof window !== 'undefined' && window.AF) {
              window.AF('pba', 'event', {
                eventType: 'EVENT',
                eventName: 'af_complete_registration',
                eventValue: {
                  af_registration_method: session.user.app_metadata?.provider || 'email',
                },
              });
              console.log('[AppsFlyer] Signup event sent for user:', session.user.id);
            }

            // Track signup with TikTok Pixel
            if (typeof window !== 'undefined' && window.ttq) {
              window.ttq.track('CompleteRegistration');
              console.log('[TikTok Pixel] CompleteRegistration event sent for user:', session.user.id);
            }
          } else {
            console.log('[Auth] Returning user, skipping registration events');
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setSubscription(null);
          setIsLoading(false);
        } else if (session?.user) {
          setUser(session.user);
          setIsLoading(false);
          fetchUserData(session.user.id);
        } else {
          setIsLoading(false);
        }
      }
    );

    return () => {
      authSubscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSubscription(null);
  };

  // Computed properties
  const isAuthenticated = !!user;
  const isSubscribed = subscription?.status === 'active' && subscription?.plan !== 'free';
  const isPro = isSubscribed && subscription?.plan === 'quarterly';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        subscription,
        isLoading,
        isAuthenticated,
        isSubscribed,
        isPro,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
