'use client';

import { useState } from 'react';
import { X, Sparkles, Video, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

const features = [
  {
    icon: Sparkles,
    title: '400 credits per quarter',
    description: 'Try on up to 200 dresses',
  },
  {
    icon: Video,
    title: 'Realistic video generation',
    description: 'See yourself walking & twirling in any gown',
  },
];

export function PaywallModal({ isOpen, onClose, onSubscribe }: PaywallModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start checkout');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Something went wrong');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-gradient-to-b from-card to-card/95 rounded-3xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Decorative top gradient */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="relative px-6 pt-8 pb-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B9D] to-[#C86DD7] mb-4 shadow-lg shadow-primary/30">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-serif text-2xl text-foreground mb-1">
              Upgrade to PRO
            </h3>
            <p className="text-muted-foreground text-sm">
              Find your perfect wedding dress
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-6">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B9D]/20 to-[#C86DD7]/20 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-foreground font-medium text-sm">{feature.title}</p>
                  <p className="text-muted-foreground text-xs">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          {/* Price Card */}
          <div className="bg-gradient-to-br from-[#FF6B9D]/10 to-[#C86DD7]/10 border border-primary/30 rounded-2xl p-4 mb-4">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-foreground font-semibold">Quarterly</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-foreground">$39.99</span>
                <span className="text-muted-foreground text-sm"> /3 months</span>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Just $13.33/month · Credits roll over
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className={cn(
              'w-full py-4 rounded-xl font-semibold text-white text-lg',
              'bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7]',
              'hover:opacity-95 active:scale-[0.98] transition-all',
              'shadow-lg shadow-primary/30',
              isLoading && 'opacity-70 cursor-not-allowed'
            )}
          >
            {isLoading ? 'Processing...' : 'Get PRO'}
          </button>

          {/* Footer */}
          <div className="mt-4 space-y-2 text-center">
            <button className="text-muted-foreground text-xs hover:text-foreground transition-colors">
              Restore Purchases
            </button>
            <p className="text-muted-foreground/60 text-[10px]">
              Cancel anytime · Billed quarterly · Secure payment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
