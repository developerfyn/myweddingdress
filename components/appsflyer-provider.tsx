'use client';

import { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth-provider';

declare global {
  interface Window {
    AF?: (command: string, ...args: any[]) => void;
  }
}

interface AppsFlyerContextValue {
  trackEvent: (eventName: string, eventValues?: Record<string, any>) => void;
  setCustomerUserId: (userId: string) => void;
}

const AppsFlyerContext = createContext<AppsFlyerContextValue>({
  trackEvent: () => {},
  setCustomerUserId: () => {},
});

export function useAppsFlyer() {
  return useContext(AppsFlyerContext);
}

function AppsFlyerIdentify() {
  const { user } = useAuth();
  const { setCustomerUserId } = useAppsFlyer();

  useEffect(() => {
    if (user?.id) {
      setCustomerUserId(user.id);
    }
  }, [user?.id, setCustomerUserId]);

  return null;
}

export function AppsFlyerProvider({ children }: { children: React.ReactNode }) {
  const isInitialized = useRef(false);
  const devKey = process.env.NEXT_PUBLIC_APPSFLYER_DEV_KEY;

  useEffect(() => {
    if (typeof window === 'undefined' || !devKey || isInitialized.current) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://websdk.appsflyer.com/web-sdk/v2.0/web-sdk.min.js';
    script.async = true;
    script.onload = () => {
      if (window.AF) {
        window.AF('pba', 'init', {
          devKey,
          appId: 'myweddingdress.app',
        });
        isInitialized.current = true;
        console.log('[AppsFlyer] SDK initialized');
      }
    };
    document.head.appendChild(script);
  }, [devKey]);

  const trackEvent = useCallback((eventName: string, eventValues?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.AF) {
      window.AF('pba', 'event', {
        eventType: 'EVENT',
        eventName,
        eventValue: eventValues,
      });
      console.log('[AppsFlyer] Event tracked:', eventName, eventValues);
    }
  }, []);

  const setCustomerUserId = useCallback((userId: string) => {
    if (typeof window !== 'undefined' && window.AF) {
      window.AF('pba', 'setCustomerUserId', userId);
      console.log('[AppsFlyer] Customer user ID set:', userId);
    }
  }, []);

  return (
    <AppsFlyerContext.Provider value={{ trackEvent, setCustomerUserId }}>
      <AppsFlyerIdentify />
      {children}
    </AppsFlyerContext.Provider>
  );
}
