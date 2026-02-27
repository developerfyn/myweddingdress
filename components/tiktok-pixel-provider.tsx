'use client';

import { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth-provider';

declare global {
  interface Window {
    TiktokAnalyticsObject?: string;
    ttq?: any;
  }
}

interface TikTokPixelContextValue {
  trackEvent: (eventName: string, eventData?: Record<string, any>) => void;
  trackViewContent: (contentId: string, contentType?: string) => void;
  trackAddToCart: (contentId: string, price?: number, currency?: string) => void;
  trackCompleteRegistration: () => void;
  trackPurchase: (value: number, currency?: string) => void;
}

const TikTokPixelContext = createContext<TikTokPixelContextValue>({
  trackEvent: () => {},
  trackViewContent: () => {},
  trackAddToCart: () => {},
  trackCompleteRegistration: () => {},
  trackPurchase: () => {},
});

export function useTikTokPixel() {
  return useContext(TikTokPixelContext);
}

function TikTokPixelIdentify() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id && typeof window !== 'undefined' && window.ttq) {
      window.ttq.identify({
        external_id: user.id,
        email: user.email,
      });
      console.log('[TikTok Pixel] User identified:', user.id);
    }
  }, [user?.id, user?.email]);

  return null;
}

export function TikTokPixelProvider({ children }: { children: React.ReactNode }) {
  const isInitialized = useRef(false);
  const pixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

  useEffect(() => {
    if (typeof window === 'undefined' || !pixelId || isInitialized.current) {
      return;
    }

    // TikTok Pixel initialization
    !function (w: any, d: Document, t: string) {
      w.TiktokAnalyticsObject = t;
      var ttq = w[t] = w[t] || [];
      ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
      ttq.setAndDefer = function (t: any, e: string) {
        t[e] = function () {
          t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (var i = 0; i < ttq.methods.length; i++) {
        ttq.setAndDefer(ttq, ttq.methods[i]);
      }
      ttq.instance = function (t: string) {
        for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) {
          ttq.setAndDefer(e, ttq.methods[n]);
        }
        return e;
      };
      ttq.load = function (e: string, n?: any) {
        var i = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = i;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        var o = d.createElement("script") as HTMLScriptElement;
        o.type = "text/javascript";
        o.async = true;
        o.src = i + "?sdkid=" + e + "&lib=" + t;
        var a = d.getElementsByTagName("script")[0];
        a.parentNode?.insertBefore(o, a);
      };

      ttq.load(pixelId);
      ttq.page();
    }(window, document, 'ttq');

    isInitialized.current = true;
    console.log('[TikTok Pixel] Initialized with ID:', pixelId);
  }, [pixelId]);

  const trackEvent = useCallback((eventName: string, eventData?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.ttq) {
      window.ttq.track(eventName, eventData);
      console.log('[TikTok Pixel] Event tracked:', eventName, eventData);
    }
  }, []);

  const trackViewContent = useCallback((contentId: string, contentType: string = 'product') => {
    if (typeof window !== 'undefined' && window.ttq) {
      window.ttq.track('ViewContent', {
        content_id: contentId,
        content_type: contentType,
      });
      console.log('[TikTok Pixel] ViewContent:', contentId);
    }
  }, []);

  const trackAddToCart = useCallback((contentId: string, price?: number, currency: string = 'USD') => {
    if (typeof window !== 'undefined' && window.ttq) {
      window.ttq.track('AddToCart', {
        content_id: contentId,
        price,
        currency,
      });
      console.log('[TikTok Pixel] AddToCart:', contentId);
    }
  }, []);

  const trackCompleteRegistration = useCallback(() => {
    if (typeof window !== 'undefined' && window.ttq) {
      window.ttq.track('CompleteRegistration');
      console.log('[TikTok Pixel] CompleteRegistration');
    }
  }, []);

  const trackPurchase = useCallback((value: number, currency: string = 'USD') => {
    if (typeof window !== 'undefined' && window.ttq) {
      window.ttq.track('CompletePayment', {
        value,
        currency,
      });
      console.log('[TikTok Pixel] CompletePayment:', value, currency);
    }
  }, []);

  return (
    <TikTokPixelContext.Provider value={{
      trackEvent,
      trackViewContent,
      trackAddToCart,
      trackCompleteRegistration,
      trackPurchase,
    }}>
      <TikTokPixelIdentify />
      {children}
    </TikTokPixelContext.Provider>
  );
}
