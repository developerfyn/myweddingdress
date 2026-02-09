'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import type { UserCredits } from '@/lib/usage-tracking';

interface UseCreditsResult {
  credits: UserCredits | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateTimezone: (timezone: string) => Promise<boolean>;
}

export function useCredits(): UseCreditsResult {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/credits');
      const data = await response.json();

      if (!response.ok) {
        // Not authenticated is not an error state - user just isn't logged in
        if (response.status === 401) {
          setCredits(null);
          return;
        }
        throw new Error(data.error || 'Failed to fetch credits');
      }

      if (data.success && data.credits) {
        setCredits(data.credits);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('[useCredits] Error fetching credits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch credits');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTimezone = useCallback(async (timezone: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update timezone');
      }

      if (data.success && data.credits) {
        setCredits(data.credits);
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useCredits] Error updating timezone:', err);
      return false;
    }
  }, []);

  // Fetch credits on mount
  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Auto-detect and update timezone on mount
  useEffect(() => {
    if (credits && credits.timezone === 'UTC') {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (userTimezone !== 'UTC') {
        updateTimezone(userTimezone);
      }
    }
  }, [credits, updateTimezone]);

  // Listen for auth state changes
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchCredits();
      } else if (event === 'SIGNED_OUT') {
        setCredits(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchCredits]);

  return {
    credits,
    isLoading,
    error,
    refetch: fetchCredits,
    updateTimezone,
  };
}
