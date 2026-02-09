'use client';

import { Coins, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatResetTime, CREDIT_COSTS } from '@/lib/usage-tracking';
import type { UserCredits } from '@/lib/usage-tracking';

interface CreditDisplayProps {
  credits: UserCredits | null;
  isLoading?: boolean;
  variant?: 'sidebar' | 'compact' | 'full';
  className?: string;
  onUpgradeClick?: () => void;
}

export function CreditDisplay({
  credits,
  isLoading = false,
  variant = 'sidebar',
  className,
  onUpgradeClick,
}: CreditDisplayProps) {
  if (isLoading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-12 bg-secondary rounded-lg" />
      </div>
    );
  }

  if (!credits) {
    return null;
  }

  const tryOnsRemaining = Math.floor(credits.credits_balance / CREDIT_COSTS.tryon);
  const videosRemaining = credits.can_generate_video
    ? Math.floor(credits.credits_balance / CREDIT_COSTS.video_generation)
    : 0;

  const resetText = formatResetTime(credits.reset_time, credits.is_free_tier);

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Coins className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium">{credits.credits_balance}</span>
        <span className="text-xs text-muted-foreground">credits</span>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={cn('p-4 rounded-xl bg-secondary/50 space-y-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            <span className="font-semibold text-foreground">Credits</span>
          </div>
          <span className="text-2xl font-bold text-foreground">
            {credits.credits_balance}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Try-ons available</span>
            <span className="font-medium">{tryOnsRemaining}</span>
          </div>
          {credits.can_generate_video && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Videos available</span>
              <span className="font-medium">{videosRemaining}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
          <Clock className="w-3 h-3" />
          <span>{resetText}</span>
        </div>

        {credits.is_free_tier && onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className="w-full mt-2 py-2 px-4 rounded-lg bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade for more credits
          </button>
        )}
      </div>
    );
  }

  // Sidebar variant (default)
  return (
    <div
      className={cn(
        'p-3 rounded-xl bg-secondary/50 border border-border',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Coins className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-foreground">
              {credits.credits_balance}
            </span>
            <span className="text-xs text-muted-foreground">credits</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {tryOnsRemaining} try-on{tryOnsRemaining !== 1 ? 's' : ''} left
          </p>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>{resetText}</span>
      </div>
    </div>
  );
}

// Inline credit badge for modals/buttons
export function CreditBadge({
  cost,
  balance,
  className,
}: {
  cost: number;
  balance: number;
  className?: string;
}) {
  const hasEnough = balance >= cost;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        hasEnough
          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
          : 'bg-destructive/20 text-destructive',
        className
      )}
    >
      <Coins className="w-3 h-3" />
      {cost} credits
    </span>
  );
}
