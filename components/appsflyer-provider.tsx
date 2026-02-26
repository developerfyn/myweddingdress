'use client';

import { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth-provider';

declare global {
  interface Window {
    AF_SDK?: any;
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
  console.log('[AppsFlyer] RENDER');
  const isInitialized = useRef(false);
  const devKey = process.env.NEXT_PUBLIC_APPSFLYER_DEV_KEY;

  useEffect(() => {
    console.log('[AppsFlyer] Provider mounted, devKey:', devKey ? 'present' : 'missing');

    if (typeof window === 'undefined' || !devKey || isInitialized.current) {
      return;
    }

    // AppsFlyer PBA Web SDK initialization
    !function(t,e,n,s,a,c,i,o,p){
      t.AppsFlyerSdkObject=a,t.AF=t.AF||function(){
      (t.AF.q=t.AF.q||[]).push([Date.now()].concat(Array.prototype.slice.call(arguments)))},
      t.AF.id=t.AF.id||i,t.AF.plugins={},o=e.createElement(n),p=e.getElementsByTagName(n)[0],
      o.async=1,
      o.src="https://websdk.appsflyer.com?"+(c.length>0?"st="+c.split(",").sort().join(",")+"&":"")+
            (i.length>0?"af_id="+i:""),
      p.parentNode.insertBefore(o,p)
    }(window,document,"script",0,"AF","pba",{pba:{webAppId:devKey}});

    isInitialized.current = true;
    console.log('[AppsFlyer] PBA SDK initialized');
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
